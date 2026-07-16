package com.kelimesavasi.app;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
// import com.google.android.gms.ads.AdRequest;
// import com.google.android.gms.ads.AdView;
// import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    // private AdView mAdViewTop;
    // private AdView mAdViewBottom;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize Google Mobile Ads SDK - DISABLED TO PREVENT FREEZING
        // MobileAds.initialize(this, initializationStatus -> {});

        // Set our custom layout
        setContentView(R.layout.activity_main);

        // Find the custom webview container we defined in XML
        FrameLayout webviewContainer = findViewById(R.id.webview_container);

        // Retrieve Capacitor's WebView instance
        WebView webView = getBridge().getWebView();

        // Enable persistent WebView storage / database cache settings & JS support
        if (webView != null) {
            WebSettings webSettings = webView.getSettings();
            if (webSettings != null) {
                webSettings.setJavaScriptEnabled(true);
                webSettings.setDomStorageEnabled(true);
                webSettings.setDatabaseEnabled(true);
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            }
            webView.setWebChromeClient(new WebChromeClient());
        }

        // Safe check and reparent the webview to our container
        if (webView != null) {
            if (webView.getParent() != null) {
                ((ViewGroup) webView.getParent()).removeView(webView);
            }
            webviewContainer.addView(webView);
        }

        // Load AdMob banners - DISABLED TO PREVENT FREEZING
        // AdRequest adRequest = new AdRequest.Builder().build();

        // mAdViewTop = findViewById(R.id.adViewTop);
        // if (mAdViewTop != null) {
        //     mAdViewTop.loadAd(adRequest);
        // }

        // mAdViewBottom = findViewById(R.id.adView);
        // if (mAdViewBottom != null) {
        //     mAdViewBottom.loadAd(adRequest);
        // }
    }

    @Override
    public void onPause() {
        // if (mAdViewTop != null) {
        //     mAdViewTop.pause();
        // }
        // if (mAdViewBottom != null) {
        //     mAdViewBottom.pause();
        // }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        // if (mAdViewTop != null) {
        //     mAdViewTop.resume();
        // }
        // if (mAdViewBottom != null) {
        //     mAdViewBottom.resume();
        // }
    }

    @Override
    public void onDestroy() {
        // if (mAdViewTop != null) {
        //     mAdViewTop.destroy();
        // }
        // if (mAdViewBottom != null) {
        //     mAdViewBottom.destroy();
        // }
        super.onDestroy();
    }
}
