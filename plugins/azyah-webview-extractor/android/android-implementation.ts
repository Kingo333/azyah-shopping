// Android Implementation Stub
// ===========================
// This file documents the required native Android implementation.
// The actual Java/Kotlin code must be written in Android Studio after exporting to GitHub.

/*
File: android/src/main/java/com/azyah/webviewextractor/AzyahWebViewExtractorPlugin.java

Required implementation:
1. Create @CapacitorPlugin annotated class
2. Implement openAndExtract method with @PluginMethod
3. Start ExtractorActivity with WebView
4. On onPageFinished, call evaluateJavascript(script)
5. Return result via ActivityResult

---

package com.azyah.webviewextractor;

import android.content.Intent;
import android.app.Activity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "AzyahWebViewExtractor")
public class AzyahWebViewExtractorPlugin extends Plugin {
    
    @PluginMethod
    public void openAndExtract(PluginCall call) {
        String url = call.getString("url");
        String script = call.getString("script");
        
        if (url == null || script == null) {
            call.reject("Missing url or script parameter");
            return;
        }
        
        Double timeoutMs = call.getDouble("timeoutMs", 15000.0);
        String toolbarColor = call.getString("toolbarColor", "#1f2937");
        
        Intent intent = new Intent(getContext(), ExtractorActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("script", script);
        intent.putExtra("timeoutMs", timeoutMs);
        intent.putExtra("toolbarColor", toolbarColor);
        
        startActivityForResult(call, intent, "handleExtractionResult");
    }
    
    @ActivityCallback
    private void handleExtractionResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            String jsonResult = result.getData().getStringExtra("result");
            try {
                // Parse and resolve
                JSObject response = new JSObject(jsonResult);
                call.resolve(response);
            } catch (Exception e) {
                call.reject("Failed to parse extraction result");
            }
        } else {
            JSObject response = new JSObject();
            response.put("success", false);
            response.put("cancelled", true);
            call.resolve(response);
        }
    }
}

---

File: android/src/main/java/com/azyah/webviewextractor/ExtractorActivity.java

public class ExtractorActivity extends AppCompatActivity {
    private WebView webView;
    private String extractionScript;
    private boolean hasCompleted = false;
    private Handler timeoutHandler = new Handler(Looper.getMainLooper());
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_extractor);
        
        String url = getIntent().getStringExtra("url");
        extractionScript = getIntent().getStringExtra("script");
        double timeoutMs = getIntent().getDoubleExtra("timeoutMs", 15000);
        
        setupWebView();
        setupToolbar();
        
        webView.loadUrl(url);
        startTimeout((long) timeoutMs);
    }
    
    private void setupWebView() {
        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                extractProductContext();
            }
        });
    }
    
    private void extractProductContext() {
        if (hasCompleted) return;
        
        webView.evaluateJavascript(extractionScript, value -> {
            if (hasCompleted) return;
            hasCompleted = true;
            timeoutHandler.removeCallbacksAndMessages(null);
            
            Intent resultIntent = new Intent();
            resultIntent.putExtra("result", value);
            setResult(RESULT_OK, resultIntent);
            finish();
        });
    }
    
    private void finishWithCancel() {
        if (!hasCompleted) {
            hasCompleted = true;
            Intent resultIntent = new Intent();
            resultIntent.putExtra("result", "{\\"success\\":false,\\"cancelled\\":true}");
            setResult(RESULT_OK, resultIntent);
            finish();
        }
    }
}

---

File: android/src/main/res/layout/activity_extractor.xml

<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    
    <androidx.appcompat.widget.Toolbar
        android:id="@+id/toolbar"
        android:layout_width="match_parent"
        android:layout_height="?attr/actionBarSize" />
    
    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="0dp" />
        
</androidx.constraintlayout.widget.ConstraintLayout>

*/

export const ANDROID_IMPLEMENTATION_NOTES = `
Android Native Implementation Required:

1. Create the following files in android/src/main/java/com/azyah/webviewextractor/:
   - AzyahWebViewExtractorPlugin.java
   - ExtractorActivity.java

2. Create layout in android/src/main/res/layout/:
   - activity_extractor.xml

3. Register Activity in AndroidManifest.xml

4. Key implementation points:
   - Use android.webkit.WebView
   - Enable JavaScript: settings.setJavaScriptEnabled(true)
   - Set WebViewClient with onPageFinished override
   - Call evaluateJavascript(script, callback) when page finishes
   - Handle timeout with Handler

5. Build in Android Studio after:
   npx cap sync android
   
6. Test on device/emulator with blocked sites (ASOS, Zara, Nike)
`;
