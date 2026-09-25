import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).parent


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"\''))


def offline_reply(messages):
    last_message = next((message.get("content", "") for message in reversed(messages)
                         if message.get("role") == "user"), "")
    if not last_message:
        return "I’m here. What would you like to work through?"
    return (f"I’m running in local mode right now, so I can’t reach the hosted model. "
            f"For your message, I’d start by breaking this into one small next step: "
            f"{last_message[:180]}")


class ChatHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404)
            return

        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            payload = json.loads(body)
            messages = payload.get("messages", [])
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                self.send_json(200, {"content": offline_reply(messages), "offline": True})
                return

            request_body = json.dumps({
                "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "messages": messages,
                "temperature": 0.7,
            }).encode("utf-8")
            request = Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=request_body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=45) as response:
                result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            self.send_json(200, {"content": content})
        except (HTTPError, URLError):
            self.send_json(200, {"content": offline_reply(messages), "offline": True})
        except (KeyError, TypeError, ValueError) as error:
            self.send_json(400, {"error": str(error)})

    def send_json(self, status, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        if self.path != "/api/chat":
            super().log_message(format, *args)


if __name__ == "__main__":
    load_env()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), lambda *args: ChatHandler(*args, directory=str(ROOT)))
    print(f"Oriole is running at http://127.0.0.1:{port}")
    server.serve_forever()