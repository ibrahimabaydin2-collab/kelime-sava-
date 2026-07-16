package com.kelimesavasi.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;

public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    private Button btnGuestLogin;
    private Button btnSocialLogin;
    private Button btnEmailLogin;
    private FirebaseAuth auth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Safe dynamic Firebase initialization
        initializeFirebaseSafely();

        auth = FirebaseAuth.getInstance();

        // 1. SESSION CHECK (Oturum Kontrolü): If already logged in, bypass login screen immediately
        if (auth.getCurrentUser() != null) {
            Log.d(TAG, "Active user session found. Redirecting to MainActivity.");
            Intent intent = new Intent(LoginActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
            return;
        }

        setContentView(R.layout.activity_login);

        btnGuestLogin = findViewById(R.id.btn_guest_login);
        btnSocialLogin = findViewById(R.id.btn_social_login);
        btnEmailLogin = findViewById(R.id.btn_email_login);

        // Click handler for Guest login page redirect
        btnGuestLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(LoginActivity.this, GuestLoginActivity.class);
                startActivity(intent);
            }
        });

        // Click handler for Social Media connection (Google standard stub)
        btnSocialLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleSocialMediaLogin();
            }
        });

        // Click handler for Email authentication (Email standard stub)
        btnEmailLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleEmailAuth();
            }
        });
    }

    private void initializeFirebaseSafely() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseOptions options = new FirebaseOptions.Builder()
                    .setProjectId("premium-realm-47c1c")
                    .setApplicationId("1:115209512617:web:741bd44e0dd493abb02bb8")
                    .setApiKey("AIzaSyDvabWvC2Qt5oky_l2hitSLpfd3x5NViEc")
                    .build();
                FirebaseApp.initializeApp(this, options);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Firebase: " + e.getMessage(), e);
        }
    }

    /**
     * Firebase Google Sign-In / Social Authentication boilerplate placeholder code
     */
    private void handleSocialMediaLogin() {
        Log.d(TAG, "Social Media (Google) sign in initiated.");
        
        // Standard Dialog explaining how Google Sign-In is configured on Android
        AlertDialog.Builder builder = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert);
        builder.setTitle("Sosyal Medya Girişi");
        builder.setMessage("Google Sign-In entegrasyonu kod taslağı hazırdır. "
                + "Geliştirme aşamasında Firebase Console üzerinden Google Auth sağlayıcısını aktifleştirip "
                + "ve GoogleSignInOptions yapılandırmasını tamamlayarak tam akışa bağlayabilirsiniz.");
        
        builder.setPositiveButton("Anladım", null);
        builder.show();

        /*
        // --- BOILERPLATE FOR GOOGLE SIGN IN ---
        // Step 1: Configure Google Sign-In options
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.default_web_client_id))
                .requestEmail()
                .build();
        GoogleSignInClient mGoogleSignInClient = GoogleSignIn.getClient(this, gso);

        // Step 2: Launch Google Sign-In intent
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);

        // Step 3: Handle result in onActivityResult
        @Override
        public void onActivityResult(int requestCode, int resultCode, Intent data) {
            super.onActivityResult(requestCode, resultCode, data);
            if (requestCode == RC_SIGN_IN) {
                Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                try {
                    GoogleSignInAccount account = task.getResult(ApiException.class);
                    firebaseAuthWithGoogle(account.getIdToken());
                } catch (ApiException e) {
                    Log.w(TAG, "Google sign in failed", e);
                }
            }
        }

        // Step 4: Authenticate with Firebase using Google credential
        private void firebaseAuthWithGoogle(String idToken) {
            AuthCredential credential = GoogleAuthProvider.getCredential(idToken, null);
            auth.signInWithCredential(credential)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            // Save profile and go to MainActivity
                        }
                    }
                });
        }
        */
        Toast.makeText(this, "Sosyal Medya Giriş Taslağı Tetiklendi!", Toast.LENGTH_SHORT).show();
    }

    /**
     * Firebase Email-Password Authentication boilerplate placeholder code
     */
    private void handleEmailAuth() {
        Log.d(TAG, "Email/Password sign in initiated.");

        AlertDialog.Builder builder = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert);
        builder.setTitle("E-posta Girişi ve Kayıt");
        builder.setMessage("E-posta ve şifre tabanlı kayıt kod taslağı hazırdır. "
                + "Firebase Auth SDK ile createUserWithEmailAndPassword() "
                + "ve signInWithEmailAndPassword() metodlarını kullanarak kullanıcı kaydı/girişi yapabilirsiniz.");
        
        builder.setPositiveButton("Anladım", null);
        builder.show();

        /*
        // --- BOILERPLATE FOR EMAIL/PASSWORD SIGN UP & SIGN IN ---
        // Email Sign-up flow:
        auth.createUserWithEmailAndPassword(email, password)
            .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                @Override
                public void onComplete(@NonNull Task<AuthResult> task) {
                    if (task.isSuccessful()) {
                        FirebaseUser user = auth.getCurrentUser();
                        // Save profile meta and redirect
                    } else {
                        Log.e(TAG, "Sign up failed", task.getException());
                    }
                }
            });

        // Email Sign-in flow:
        auth.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                @Override
                public void onComplete(@NonNull Task<AuthResult> task) {
                    if (task.isSuccessful()) {
                        FirebaseUser user = auth.getCurrentUser();
                        // Redirect to MainActivity
                    } else {
                        Log.e(TAG, "Sign in failed", task.getException());
                    }
                }
            });
        */
        Toast.makeText(this, "E-posta Kayıt Taslağı Tetiklendi!", Toast.LENGTH_SHORT).show();
    }
}
