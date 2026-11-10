package io.github.troglobiont.synstudy;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/syn/index.html";
    private static final int EXPORT = 101, IMPORT = 102;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private File pendingExport;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245,241,232));
        root.setOnApplyWindowInsetsListener((v,insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
            (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245,241,232));
        root.addView(webView,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        webView.addJavascriptInterface(new FileBridge(),"SynAndroid");
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
                if (local(request.getUrl())) {
                    WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                    return response != null ? response : blocked(404);
                }
                return blocked(403);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                if (local(request.getUrl())) return false;
                Uri uri = request.getUrl();
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); }
                    catch (ActivityNotFoundException e) { toast("Нет приложения для открытия ссылки."); }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    startActivityForResult(intent,IMPORT);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    toast("Системный выбор файла недоступен."); return false;
                }
            }
        });
        if (savedState != null) {
            String path = savedState.getString("pendingExport");
            if (path != null) {
                File f = new File(path);
                try { if (f.getCanonicalFile().getParentFile().equals(getCacheDir().getCanonicalFile()) && f.isFile()) pendingExport = f; }
                catch (Exception ignored) { pendingExport = null; }
            }
        }
        if (savedState == null || webView.restoreState(savedState) == null) webView.loadUrl(START);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::navigateBack);
        }
    }
    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) &&
            uri.getPort() == -1 && uri.getPath() != null && uri.getPath().startsWith("/assets/syn/");
    }
    private static WebResourceResponse blocked(int status) {
        return new WebResourceResponse("text/plain","UTF-8",status,status == 404 ? "Not Found" : "Forbidden",
            java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
    }
    private void navigateBack() {
        webView.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()",value -> {
            if ("true".equals(value)) return;
            if (webView.canGoBack()) webView.goBack(); else finish();
        });
    }
    @Override public void onBackPressed() { navigateBack(); }
    @Override protected void onPause() { webView.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);webView.saveState(out);
        if (pendingExport != null) out.putString("pendingExport",pendingExport.getAbsolutePath());
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        webView.removeJavascriptInterface("SynAndroid");webView.destroy();super.onDestroy();
    }
    private void toast(String message) { Toast.makeText(this,message,Toast.LENGTH_LONG).show(); }
    private void exportResult(String status) {
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('syn-native-export',{detail:"+
            JSONObject.quote(status)+"}));",null);
    }
    private final class FileBridge {
        @JavascriptInterface public void saveJson(String text,String name) {
            if (text == null || text.length() > 1_000_000) {
                runOnUiThread(() -> exportResult("error")); return;
            }
            runOnUiThread(() -> {
                if (!local(Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()))) return;
                if (pendingExport != null) { toast("Сначала завершите предыдущее сохранение."); return; }
                try {
                    pendingExport = File.createTempFile("syn-export-",".json",getCacheDir());
                    try (FileOutputStream out = new FileOutputStream(pendingExport)) {
                        out.write(text.getBytes(StandardCharsets.UTF_8));
                    }
                    String safeName = name != null ? name.replaceAll("[^a-zA-Z0-9._-]","_") : "SYN-Study.json";
                    if (!safeName.endsWith(".json")) safeName += ".json";
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE,safeName.substring(0,Math.min(safeName.length(),100)));
                    startActivityForResult(intent,EXPORT);
                } catch (Exception e) {
                    if (pendingExport != null) pendingExport.delete();
                    pendingExport = null;exportResult("error");
                }
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (request == IMPORT && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ?
                new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == EXPORT) {
            try {
                if (result != RESULT_OK || data == null || data.getData() == null) { exportResult("cancelled"); return; }
                if (pendingExport == null || !pendingExport.isFile()) throw new IllegalStateException("missing export");
                try (java.io.InputStream input = new java.io.FileInputStream(pendingExport);
                     OutputStream output = getContentResolver().openOutputStream(data.getData(),"wt")) {
                    if (output == null) throw new IllegalStateException("output unavailable");
                    byte[] buffer = new byte[8192];int n;
                    while ((n=input.read(buffer)) != -1) output.write(buffer,0,n);
                }
                exportResult("saved");
            } catch (Exception e) { exportResult("error"); }
            finally { if (pendingExport != null) pendingExport.delete();pendingExport = null; }
        }
    }
    public WebView getLearningView() { return webView; }
}
