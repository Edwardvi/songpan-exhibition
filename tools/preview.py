"""Local static preview with byte ranges and an optional GitHub project prefix."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, unquote
import argparse,re

ROOT=Path(__file__).resolve().parents[1]/'site'
class Handler(SimpleHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def translate_path(self,path):
        parsed=urlsplit(path).path
        prefix=self.server.preview_prefix
        if prefix:
            if not parsed.startswith(prefix+'/') and parsed!=prefix:return str(ROOT/'__outside_preview__')
            parsed=parsed[len(prefix):] or '/'
        candidate=(ROOT/unquote(parsed).lstrip('/')).resolve()
        if not candidate.is_relative_to(ROOT.resolve()):return str(ROOT/'__outside_preview__')
        return str(candidate)
    def send_head(self):
        self.range_bounds=None
        path=Path(self.translate_path(self.path))
        if path.is_dir():
            if not urlsplit(self.path).path.endswith('/'):
                current=urlsplit(self.path);self.send_response(301);self.send_header('Location',current.path+'/'+('?' + current.query if current.query else ''));self.send_header('Content-Length','0');self.end_headers();return None
            path=path/'index.html'
        if not path.is_file():self.send_error(404,'File not found');return None
        stream=path.open('rb');size=path.stat().st_size
        requested=self.headers.get('Range')
        start,end=0,size-1
        if requested:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested)
            try:
                if not match or not any(match.groups()):raise ValueError
                first,last=match.groups()
                if first:start=int(first);end=min(int(last),size-1) if last else size-1
                else:start=max(0,size-int(last));end=size-1
                if start>=size or start>end:raise ValueError
            except ValueError:
                stream.close();self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
            self.range_bounds=(start,end);stream.seek(start)
        self.send_response(206 if requested else 200)
        self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Content-Length',str(end-start+1))
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Last-Modified',self.date_time_string(path.stat().st_mtime))
        self.send_header('Cache-Control','no-cache')
        if requested:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers();return stream
    def copyfile(self,source,output):
        remaining=self.range_bounds[1]-self.range_bounds[0]+1 if self.range_bounds else None
        try:
            while remaining is None or remaining>0:
                block=source.read(min(262144,remaining) if remaining is not None else 262144)
                if not block:break
                output.write(block)
                if remaining is not None:remaining-=len(block)
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,format,*args):
        if args and str(args[1]) not in ['200','206','301']:super().log_message(format,*args)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8080);parser.add_argument('--prefix',default='')
    args=parser.parse_args();server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.preview_prefix=args.prefix.rstrip('/')
    print(f'Preview: http://127.0.0.1:{args.port}{server.preview_prefix}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
