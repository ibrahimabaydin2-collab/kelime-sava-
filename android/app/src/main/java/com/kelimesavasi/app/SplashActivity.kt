package com.kelimesavasi.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Sleek 1.5-second splash screen transition delay
        Handler(Looper.getMainLooper()).postDelayed({
            checkUserSession()
        }, 1500)
    }

    private fun checkUserSession() {
        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser != null) {
            // User is already logged in, skip login screen and launch Main lobby
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
        } else {
            // No active session, prompt user with the login/guest entrance screen
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
        }
        finish()
    }
}
