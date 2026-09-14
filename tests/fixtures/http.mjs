import { readFileSync, appendFileSync } from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import protobuf from "protobufjs";

const Info = protobuf.loadSync(new URL("../../proto/flights.proto", import.meta.url).pathname).lookupType("Info");

if (process.env.FLYFAR_TEST_OPEN) {
  const spawn = childProcess.spawn;
  childProcess.spawn = (command, args, options) => {
    if (command === "open" || command === "xdg-open") {
      appendFileSync(process.env.FLYFAR_TEST_OPEN, args[0] + "\n");
      return spawn(process.execPath, ["-e", ""], options);
    }
    return spawn(command, args, options);
  };
  syncBuiltinESMExports();
}

const fixture = readFileSync(new URL("./flights.html", import.meta.url), "utf8");
// 僅替換子程序 HTTP 邊界；CLI、protobuf、parser 與輸出均使用產品實作。
globalThis.fetch = async (url) => {
  if (process.env.FLYFAR_TEST_REQUESTS) appendFileSync(process.env.FLYFAR_TEST_REQUESTS, String(url) + "\n");
  let html = fixture;
  const query = Info.toObject(Info.decode(Buffer.from(new URL(url).searchParams.get("tfs"), "base64")));
  const selected = query.data?.[0]?.selectedFlights?.length > 0;
  if (process.env.FLYFAR_TEST_RESPONSE === "roundtrip") {
    html = readFileSync(new URL(selected ? "./roundtrip-return.html" : "./roundtrip-outbound.html", import.meta.url), "utf8");
  } else if (selected) {
    html = readFileSync(new URL("./roundtrip-return.html", import.meta.url), "utf8");
  }
  if (selected && process.env.FLYFAR_TEST_RESPONSE === "wrong-return") html = fixture;
  if (selected && process.env.FLYFAR_TEST_RESPONSE === "empty-return") html = '<script class="ds:1">data:[null,null,null,[[]]], sideChannel:{}</script>';
  if (process.env.FLYFAR_TEST_RESPONSE === "empty") html = '<script class="ds:1">data:[null,null,null,[[]]], sideChannel:{}</script>';
  if (process.env.FLYFAR_TEST_RESPONSE === "malformed") html = "<html>upstream structure changed</html>";
  return new Response(html.padEnd(1200, " "), { status: 200 });
};
