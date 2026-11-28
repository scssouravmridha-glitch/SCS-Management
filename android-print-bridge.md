# Android অ্যাপ: সব অ্যাপের প্রিন্ট ও ডাউনলোড (একটাই কমান্ড)

SCS Management এর সব অ্যাপ (Quotation, Report, Store, Projects …) প্রিন্ট করার সময় একটাই কমান্ড ডাকে।
Android অ্যাপের WebView এ নিচের `SCSAndroid` যোগ করলেই সব প্রিন্ট **Android এর নিজের প্রিন্ট ডায়ালগে** খোলে
(প্রিন্টার বাছাই, "Save as PDF", কাগজের মাপ — সব Android থেকে)। PDF/Word ডাউনলোডও ফোনের Downloads এ যায়।

ওয়েবসাইটের দিকে কিছু করতে হবে না — `assets/scs-core.js` নিজে থেকেই `SCSAndroid` খোঁজে।
সাধারণ ব্রাউজারে আগের মতোই ব্রাউজারের প্রিন্ট চলে।

## 1. MainActivity.kt — WebView সেটআপ

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true          // অ্যাপের ডাটা/লগইন মনে রাখার জন্য
webView.settings.databaseEnabled = true
webView.addJavascriptInterface(ScsBridge(this, webView), "SCSAndroid")
webView.loadUrl("https://scssouravmridha-glitch.github.io/SCS-Management/")
```

## 2. ScsBridge.kt

```kotlin
import android.app.Activity
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.File

class ScsBridge(private val activity: Activity, private val main: WebView) {

    // সব অ্যাপের প্রিন্ট এখানে আসে: যা প্রিন্ট হবে তার পুরো HTML
    @JavascriptInterface
    fun print(html: String, title: String, baseUrl: String) {
        activity.runOnUiThread {
            val pv = WebView(activity)                       // আলাদা (লুকানো) WebView এ পেজটা বসানো
            pv.settings.javaScriptEnabled = false
            pv.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String?) {
                    val pm = activity.getSystemService(Activity.PRINT_SERVICE) as PrintManager
                    val name = if (title.isBlank()) "SCS" else title
                    pm.print(name, view.createPrintDocumentAdapter(name),
                        PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build())
                }
            }
            pv.loadDataWithBaseURL(baseUrl, html, "text/html", "UTF-8", null)
            printViews.add(pv)                               // প্রিন্ট শেষ না হওয়া পর্যন্ত মুছে না যায়
        }
    }

    // PDF / Word / Excel ডাউনলোড -> ফোনের Downloads
    @JavascriptInterface
    fun saveFile(base64: String, name: String, mime: String) {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                val v = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, mime)
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SCS")
                }
                val uri = activity.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v)!!
                activity.contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
            } else {
                val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "SCS")
                dir.mkdirs(); File(dir, name).writeBytes(bytes)
            }
            activity.runOnUiThread { Toast.makeText(activity, "Saved: Downloads/SCS/$name", Toast.LENGTH_LONG).show() }
        } catch (e: Exception) {
            activity.runOnUiThread { Toast.makeText(activity, "Could not save: ${e.message}", Toast.LENGTH_LONG).show() }
        }
    }

    private val printViews = mutableListOf<WebView>()
}
```

## 3. যা যা আপনা-আপনি হয়
| ওয়েব অ্যাপে | Android অ্যাপে |
|---|---|
| `window.print()` (রিপোর্ট, টেবিল, স্টোর…) | পুরো পেজ → Android প্রিন্ট ডায়ালগ |
| লুকানো ফ্রেম দিয়ে প্রিন্ট (Quotation, Workspace, Leave) | শুধু সেই কাগজের পাতা → Android প্রিন্ট ডায়ালগ |
| নতুন উইন্ডো খুলে প্রিন্ট (Chemical Order, Projects বিল) | সেই উইন্ডোর লেখা → Android প্রিন্ট ডায়ালগ |
| PDF / Word ডাউনলোড বাটন | ফোনের Downloads/SCS ফোল্ডারে সেভ |

প্রিন্টের কাগজের মাপ আর মার্জিন পেজের CSS (`@page`) অনুযায়ী হয়; ডায়ালগ থেকেও বদলানো যায়।
