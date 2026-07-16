package com.kelimesavasi.app;

import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputFilter;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.TimeZone;

public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    private Button btnGuestLogin;
    private FirebaseAuth auth;
    private FirebaseFirestore db;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Dynamic safe initializer
        initializeFirebaseSafely();

        auth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();

        btnGuestLogin = findViewById(R.id.btn_guest_login);

        btnGuestLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showNicknameDialog();
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
     * Shows a mandatory, non-cancelable dialog requiring a valid nickname
     * before starting the guest session.
     */
    private void showNicknameDialog() {
        final AppCompatActivity context = this;
        AlertDialog.Builder builder = new AlertDialog.Builder(context, android.R.style.Theme_DeviceDefault_Dialog_Alert);
        
        builder.setTitle("Kullanıcı Adı Belirle");
        builder.setMessage("Lobi ve yarışlarda görünecek kullanıcı adınızı giriniz (en az 3, en fazla 15 karakter):");

        // Create an elegant layout wrapper for EditText to ensure padding
        FrameLayout container = new FrameLayout(context);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        // Convert dp to pixels for standard padding
        int marginPx = (int) (20 * context.getResources().getDisplayMetrics().density);
        params.setMargins(marginPx, marginPx / 2, marginPx, marginPx / 2);

        final EditText inputEditText = new EditText(context);
        inputEditText.setLayoutParams(params);
        inputEditText.setHint("Kullanıcı adı giriniz...");
        inputEditText.setSingleLine(true);
        // Set maximum length filter to 15 characters
        inputEditText.setFilters(new InputFilter[]{new InputFilter.LengthFilter(15)});
        
        container.addView(inputEditText);
        builder.setView(container);

        builder.setCancelable(false); // Make the dialog completely non-cancelable

        builder.setPositiveButton("Giriş Yap", null); // Set null to override behavior and handle dismiss manually
        builder.setNegativeButton("İptal", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });

        final AlertDialog dialog = builder.create();
        dialog.show();

        // Override button click handlers to prevent auto-closing on invalid input
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String rawNickname = inputEditText.getText().toString();
                String cleanNickname = rawNickname.trim();

                // Validate the entered username
                if (cleanNickname.isEmpty()) {
                    inputEditText.setError("Kullanıcı adı boş bırakılamaz!");
                    Toast.makeText(context, "Lütfen geçerli bir kullanıcı adı yazın.", Toast.LENGTH_SHORT).show();
                } else if (cleanNickname.length() < 3) {
                    inputEditText.setError("En az 3 karakter olmalıdır!");
                    Toast.makeText(context, "Kullanıcı adı çok kısa!", Toast.LENGTH_SHORT).show();
                } else {
                    dialog.dismiss();
                    performGuestSignIn(cleanNickname);
                }
            }
        });
    }

    /**
     * Performs anonymous sign-in via Firebase Auth and records the username mapping on success.
     */
    private void performGuestSignIn(final String nickname) {
        // Disable the login button to prevent duplicate login triggers
        btnGuestLogin.setEnabled(false);
        Toast.makeText(this, "Giriş yapılıyor, lütfen bekleyin...", Toast.LENGTH_SHORT).show();

        auth.signInAnonymously()
            .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                @Override
                public void onComplete(@NonNull Task<AuthResult> task) {
                    if (task.isSuccessful()) {
                        FirebaseUser firebaseUser = auth.getCurrentUser();
                        if (firebaseUser != null) {
                            saveGuestProfileToFirestore(firebaseUser.getUid(), nickname);
                        } else {
                            btnGuestLogin.setEnabled(true);
                            Toast.makeText(LoginActivity.this, "Giriş başarısız oldu. Lütfen tekrar deneyin.", Toast.LENGTH_LONG).show();
                        }
                    } else {
                        btnGuestLogin.setEnabled(true);
                        String errorMessage = task.getException() != null ? task.getException().getLocalizedMessage() : "Bilinmeyen bir hata oluştu.";
                        Toast.makeText(LoginActivity.this, "Bağlantı Hatası: " + errorMessage, Toast.LENGTH_LONG).show();
                    }
                }
            });
    }

    /**
     * Persists the newly created guest user metadata under the /users/{uid} document in Firestore.
     */
    private void saveGuestProfileToFirestore(final String uid, final String nickname) {
        DocumentReference userRef = db.collection("users").document(uid);
        
        // Generate ISO date format for perfect compatibility with React app
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        String isoNow = sdf.format(new Date());

        HashMap<String, Object> userData = new HashMap<>();
        userData.put("uid", uid);
        userData.put("id", uid); // Bind 'id' for full Javascript web compatibility
        userData.put("name", nickname);
        userData.put("isAnonymous", true);
        userData.put("nameSet", true);
        userData.put("createdAt", Timestamp.now());
        userData.put("updatedAt", Timestamp.now());
        userData.put("lastUpdated", isoNow);
        userData.put("dailyScore", 0);

        // Pre-populate core stats mapping to prevent JS parsing errors on fresh logins
        HashMap<String, Object> stats = new HashMap<>();
        stats.put("gamesPlayed", 0);
        stats.put("gamesWon", 0);
        stats.put("currentStreak", 0);
        stats.put("maxStreak", 0);
        
        ArrayList<Integer> winDistribution = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            winDistribution.add(0);
        }
        stats.put("winDistribution", winDistribution);
        userData.put("stats", stats);

        userRef.set(userData)
            .addOnSuccessListener(new OnSuccessListener<Void>() {
                @Override
                public void onSuccess(Void aVoid) {
                    Toast.makeText(LoginActivity.this, "Oturum Başarıyla Açıldı!", Toast.LENGTH_SHORT).show();
                    
                    // Complete login, navigate to MainActivity lobby
                    Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                    startActivity(intent);
                    finish();
                }
            })
            .addOnFailureListener(new OnFailureListener() {
                @Override
                public void onFailure(@NonNull Exception e) {
                    btnGuestLogin.setEnabled(true);
                    Toast.makeText(
                        LoginActivity.this,
                        "Kullanıcı verisi kaydedilemedi: " + e.getLocalizedMessage(),
                        Toast.LENGTH_LONG
                    ).show();
                }
            });
    }
}
