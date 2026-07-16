package com.kelimesavasi.app

import android.content.Intent
import android.os.Bundle
import android.text.InputFilter
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class LoginActivity : AppCompatActivity() {

    private lateinit var btnGuestLogin: Button
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    override fun onCreate(savedInstanceState) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        btnGuestLogin = findViewById(R.id.btn_guest_login)

        btnGuestLogin.setOnClickListener {
            showNicknameDialog()
        }
    }

    /**
     * Shows a mandatory, non-cancelable dialog requiring a valid nickname
     * before starting the guest session.
     */
    private fun showNicknameDialog() {
        val context = this
        val builder = AlertDialog.Builder(context, android.R.style.Theme_DeviceDefault_Dialog_Alert)
        
        builder.setTitle("Kullanıcı Adı Belirle")
        builder.setMessage("Lobi ve yarışlarda görünecek kullanıcı adınızı giriniz (en az 3, en fazla 15 karakter):")

        // Create an elegant layout wrapper for EditText to ensure padding
        val container = FrameLayout(context)
        val params = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        // Convert dp to pixels for standard padding
        val marginPx = (20 * context.resources.displayMetrics.density).toInt()
        params.setMargins(marginPx, marginPx / 2, marginPx, marginPx / 2)

        val inputEditText = EditText(context)
        inputEditText.layoutParams = params
        inputEditText.hint = "Kullanıcı adı giriniz..."
        inputEditText.setSingleLine(true)
        // Set maximum length filter to 15 characters
        inputEditText.filters = arrayOf(InputFilter.LengthFilter(15))
        
        container.addView(inputEditText)
        builder.setView(container)

        builder.setCancelable(false) // Make the dialog completely non-cancelable

        builder.setPositiveButton("Giriş Yap", null) // Set null to override behavior and handle dismiss manually
        builder.setNegativeButton("İptal", null)

        val dialog = builder.create()
        dialog.show()

        // Override button click handlers to prevent auto-closing on invalid input
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val rawNickname = inputEditText.text.toString()
            val cleanNickname = rawNickname.trim()

            // Validate the entered username
            if (cleanNickname.isEmpty()) {
                inputEditText.error = "Kullanıcı adı boş bırakılamaz!"
                Toast.makeText(context, "Lütfen geçerli bir kullanıcı adı yazın.", Toast.LENGTH_SHORT).show()
            } else if (cleanNickname.length < 3) {
                inputEditText.error = "En az 3 karakter olmalıdır!"
                Toast.makeText(context, "Kullanıcı adı çok kısa!", Toast.LENGTH_SHORT).show()
            } else {
                dialog.dismiss()
                performGuestSignIn(cleanNickname)
            }
        }

        dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setOnClickListener {
            dialog.dismiss()
        }
    }

    /**
     * Performs anonymous sign-in via Firebase Auth and records the username mapping on success.
     */
    private fun performGuestSignIn(nickname: String) {
        // Disable the login button to prevent duplicate login triggers
        btnGuestLogin.isEnabled = false
        Toast.makeText(this, "Giriş yapılıyor, lütfen bekleyin...", Toast.LENGTH_SHORT).show()

        auth.signInAnonymously()
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    val firebaseUser = auth.currentUser
                    if (firebaseUser != null) {
                        saveGuestProfileToFirestore(firebaseUser.uid, nickname)
                    } else {
                        btnGuestLogin.isEnabled = true
                        Toast.makeText(this, "Giriş başarısız oldu. Lütfen tekrar deneyin.", Toast.LENGTH_LONG).show()
                    }
                } else {
                    btnGuestLogin.isEnabled = true
                    val errorMessage = task.exception?.localizedMessage ?: "Bilinmeyen bir hata oluştu."
                    Toast.makeText(this, "Bağlantı Hatası: $errorMessage", Toast.LENGTH_LONG).show()
                }
            }
    }

    /**
     * Persists the newly created guest user metadata under the /users/{uid} document in Firestore.
     */
    private fun saveGuestProfileToFirestore(uid: String, nickname: String) {
        val userRef = db.collection("users").document(uid)
        
        val userData = hashMapOf(
            "uid" to uid,
            "name" to nickname,
            "isAnonymous" to true,
            "createdAt" to Timestamp.now(),
            "updatedAt" to Timestamp.now()
        )

        userRef.set(userData)
            .addOnSuccessListener {
                Toast.makeText(this, "Oturum Başarıyla Açıldı!", Toast.LENGTH_SHORT).show()
                
                // Complete login, navigate to MainActivity lobby
                val intent = Intent(this, MainActivity::class.java)
                startActivity(intent)
                finish()
            }
            .addOnFailureListener { e ->
                btnGuestLogin.isEnabled = true
                Toast.makeText(
                    this,
                    "Kullanıcı verisi kaydedilemedi: ${e.localizedMessage}",
                    Toast.LENGTH_LONG
                ).show()
            }
    }
}
