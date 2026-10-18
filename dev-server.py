"""개발용 로컬 서버: 캐시 없이 파일을 내보냅니다.  python3 dev-server.py [포트]"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
