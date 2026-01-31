// iOS Implementation Stub
// =========================
// This file documents the required native iOS implementation.
// The actual Swift code must be written in Xcode after exporting to GitHub.

/*
File: ios/Plugin/AzyahWebViewExtractorPlugin.swift

Required implementation:
1. Create a CAPPlugin subclass with @objc(AzyahWebViewExtractorPlugin)
2. Implement openAndExtract method
3. Present ExtractorViewController with WKWebView
4. On didFinish navigation, call evaluateJavaScript(script)
5. Return result via call.resolve()

---

import Capacitor
import WebKit

@objc(AzyahWebViewExtractorPlugin)
public class AzyahWebViewExtractorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AzyahWebViewExtractorPlugin"
    public let jsName = "AzyahWebViewExtractor"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openAndExtract", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func openAndExtract(_ call: CAPPluginCall) {
        guard let url = call.getString("url"),
              let script = call.getString("script") else {
            call.reject("Missing url or script parameter")
            return
        }
        
        let timeoutMs = call.getDouble("timeoutMs") ?? 15000
        let toolbarColor = call.getString("toolbarColor") ?? "#1f2937"
        
        DispatchQueue.main.async {
            let vc = ExtractorViewController(
                url: url,
                script: script,
                timeoutMs: timeoutMs,
                toolbarColor: toolbarColor
            ) { result in
                call.resolve(result)
            }
            
            let nav = UINavigationController(rootViewController: vc)
            nav.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(nav, animated: true)
        }
    }
}

---

File: ios/Plugin/ExtractorViewController.swift

class ExtractorViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!
    private let urlString: String
    private let extractionScript: String
    private let timeoutMs: Double
    private let toolbarColor: String
    private let completion: ([String: Any]) -> Void
    
    private var hasCompleted = false
    private var timeoutTimer: Timer?
    
    init(url: String, script: String, timeoutMs: Double, toolbarColor: String, completion: @escaping ([String: Any]) -> Void) {
        self.urlString = url
        self.extractionScript = script
        self.timeoutMs = timeoutMs
        self.toolbarColor = toolbarColor
        self.completion = completion
        super.init(nibName: nil, bundle: nil)
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupToolbar()
        loadURL()
        startTimeout()
    }
    
    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        view.addSubview(webView)
    }
    
    // WKNavigationDelegate - extraction trigger
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        extractProductContext()
    }
    
    private func extractProductContext() {
        webView.evaluateJavaScript(extractionScript) { [weak self] result, error in
            guard let self = self, !self.hasCompleted else { return }
            self.hasCompleted = true
            self.timeoutTimer?.invalidate()
            
            if let error = error {
                self.finishWithResult([
                    "success": false,
                    "error": error.localizedDescription
                ])
                return
            }
            
            if let dict = result as? [String: Any] {
                self.finishWithResult(dict)
            } else {
                self.finishWithResult([
                    "success": false,
                    "error": "Invalid extraction result format"
                ])
            }
        }
    }
    
    @objc private func doneTapped() {
        if !hasCompleted {
            hasCompleted = true
            completion(["success": false, "cancelled": true])
        }
        dismiss(animated: true)
    }
    
    private func finishWithResult(_ result: [String: Any]) {
        dismiss(animated: true) {
            self.completion(result)
        }
    }
}

---

File: ios/Plugin/AzyahWebViewExtractorPlugin.m (Objective-C bridge)

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AzyahWebViewExtractorPlugin, "AzyahWebViewExtractor",
    CAP_PLUGIN_METHOD(openAndExtract, CAPPluginReturnPromise);
)

*/

export const IOS_IMPLEMENTATION_NOTES = `
iOS Native Implementation Required:

1. Create the following files in ios/Plugin/:
   - AzyahWebViewExtractorPlugin.swift
   - ExtractorViewController.swift  
   - AzyahWebViewExtractorPlugin.m

2. Key implementation points:
   - Use WKWebView (not WKWebViewConfiguration alone)
   - Set navigationDelegate to detect didFinish
   - Call evaluateJavaScript(script) when page finishes loading
   - Handle timeout with Timer
   - Add "Done" button to navigation bar

3. Build in Xcode after:
   npx cap sync ios
   
4. Test on device/simulator with blocked sites (ASOS, Zara, Nike)
`;
