package com.kelimesavasi.app;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    private AdView mAdViewTop;
    private AdView mAdViewBottom;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize Google Mobile Ads SDK
        MobileAds.initialize(this, initializationStatus -> {});

        // Set our custom layout
        setContentView(R.layout.activity_main);

        // Find the custom webview container we defined in XML
        FrameLayout webviewContainer = findViewById(R.id.webview_container);

        // Retrieve Capacitor's WebView instance
        WebView webView = getBridge().getWebView();

        // Enable persistent WebView storage / database cache settings
        if (webView != null && webView.getSettings() != null) {
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
        }

        // Safe check and reparent the webview to our container
        if (webView.getParent() != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
        webviewContainer.addView(webView);

        // Load AdMob banners
        AdRequest adRequest = new AdRequest.Builder().build();

        mAdViewTop = findViewById(R.id.adViewTop);
        if (mAdViewTop != null) {
            mAdViewTop.loadAd(adRequest);
        }

        mAdViewBottom = findViewById(R.id.adView);
        if (mAdViewBottom != null) {
            mAdViewBottom.loadAd(adRequest);
        }
    }

    @Override
    public void onPause() {
        if (mAdViewTop != null) {
            mAdViewTop.pause();
        }
        if (mAdViewBottom != null) {
            mAdViewBottom.pause();
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mAdViewTop != null) {
            mAdViewTop.resume();
        }
        if (mAdViewBottom != null) {
            mAdViewBottom.resume();
        }
    }

    @Override
    public void onDestroy() {
        if (mAdViewTop != null) {
            mAdViewTop.destroy();
        }
        if (mAdViewBottom != null) {
            mAdViewBottom.destroy();
        }
        super.onDestroy();
    }
}
