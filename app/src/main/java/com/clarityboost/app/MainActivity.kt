package com.clarityboost.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.content.ContentValues
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import java.io.OutputStream
import android.util.Base64
import android.os.Bundle
import android.webkit.*
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var pendingUpload: ValueCallback<Array<Uri>>? = null
    private val pickVideo = 4102
    private val saveExport = 4103
    private var pendingExportBytes: ByteArray? = null
    private var pendingExportName: String = "clarityboost-enhanced.webm"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun saveBase64(base64: String, fileName: String) {
                runOnUiThread {
                    try {
                        pendingExportBytes = Base64.decode(base64, Base64.DEFAULT)
                        pendingExportName = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_")
                        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "video/webm"
                            putExtra(Intent.EXTRA_TITLE, pendingExportName)
                        }
                        startActivityForResult(intent, saveExport)
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Cannot prepare video for saving", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }, "AndroidSave")
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
        } else if (requestCode == saveExport) {
            val uri = if (resultCode == RESULT_OK) data?.data else null
            val bytes = pendingExportBytes
            if (uri != null && bytes != null) {
                try {
                    contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    Toast.makeText(this, "Video saved successfully", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    Toast.makeText(this, "Failed to save video", Toast.LENGTH_LONG).show()
                }
            }
            pendingExportBytes = null
        }
    }

    @Deprecated("Deprecated API")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
