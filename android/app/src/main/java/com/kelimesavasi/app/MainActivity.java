package com.kelimesavasi.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    private AdView mAdViewTop;
    private AdView mAdViewBottom;
    private WebView mWebView;
    private boolean mAdsInitialized = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set our custom layout
        setContentView(R.layout.activity_main);

        // Find the custom webview container we defined in XML
        FrameLayout webviewContainer = findViewById(R.id.webview_container);

        // Retrieve Capacitor's WebView instance
        mWebView = getBridge().getWebView();

        // Enable persistent WebView storage / database cache settings & JS support
        if (mWebView != null) {
            WebSettings webSettings = mWebView.getSettings();
            if (webSettings != null) {
                webSettings.setJavaScriptEnabled(true);
                webSettings.setDomStorageEnabled(true);
                webSettings.setDatabaseEnabled(true);
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            }
            mWebView.setWebChromeClient(new WebChromeClient());
        }

        // Safe check and reparent the webview to our container
        if (mWebView != null) {
            if (mWebView.getParent() != null) {
                ((ViewGroup) mWebView.getParent()).removeView(mWebView);
            }
            webviewContainer.addView(mWebView);
        }

        mAdViewTop = findViewById(R.id.adViewTop);
        mAdViewBottom = findViewById(R.id.adViewBottom);

        // Defer AdMob initialization to a background handler to ensure the main UI rendering thread is completely untouched and free of latency
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                // Initialize Google Mobile Ads SDK asynchronously
                MobileAds.initialize(MainActivity.this, initializationStatus -> {
                    mAdsInitialized = true;
                    loadBanners();
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, 600); // 600ms delay gives WebView enough time to render completely and prevents layout flickering or white flashes
    }

    private void loadBanners() {
        runOnUiThread(() -> {
            try {
                AdRequest adRequest = new AdRequest.Builder().build();
                if (mAdViewTop != null) {
                    mAdViewTop.loadAd(adRequest);
                }
                if (mAdViewBottom != null) {
                    mAdViewBottom.loadAd(adRequest);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public void onPause() {
        if (mAdViewTop != null) {
            mAdViewTop.pause();
        }
        if (mAdViewBottom != null) {
            mAdViewBottom.pause();
        }
        // Pause WebView JS execution, CSS transitions, and Web Audio context
        if (mWebView != null) {
            mWebView.onPause();
            mWebView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    public void onStop() {
        // Ensure web view is paused when the activity is stopped
        if (mWebView != null) {
            mWebView.onPause();
            mWebView.pauseTimers();
        }
        super.onStop();
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
        // Resume WebView JS execution, CSS transitions, and Web Audio context
        if (mWebView != null) {
            mWebView.onResume();
            mWebView.resumeTimers();
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
