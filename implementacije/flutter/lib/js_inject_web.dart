// Web: skripte ubačene kroz innerHTML se NE izvršavaju (zato relatedJs iz
// model_viewer_plus na webu ne radi) — ubacujemo <script> element ručno.
import 'package:web/web.dart' as web;

bool _injected = false;

void injectJsOnce(String code) {
  if (_injected) return;
  _injected = true;
  final s = web.HTMLScriptElement()..text = code;
  web.document.body!.append(s);
}
