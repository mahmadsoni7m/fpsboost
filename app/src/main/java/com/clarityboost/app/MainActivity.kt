package com.clarityboost.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var pendingUpload: ValueCallback<Array<Uri>>? = null
    private val pickVideo = 4102

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                pendingUpload?.onReceiveValue(null)
                pendingUpload = filePathCallback
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "video/*"
                }
                startActivityForResult(intent, pickVideo)
                return true
            }
        }
        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/web/index.html")
        setContentView(webView)
    }

    @Deprecated("Deprecated in Android API, retained for broad device compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == pickVideo) {
            val result = if (resultCode == RESULT_OK && data?.data != null)
                arrayOf(data.data!!) else null
            pendingUpload?.onReceiveValue(result)
            pendingUpload = null
        }
    }

    @Deprecated("Deprecated API")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
