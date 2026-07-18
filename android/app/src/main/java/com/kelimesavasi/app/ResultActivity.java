package com.kelimesavasi.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class ResultActivity extends AppCompatActivity {

    private TextView tvTargetWord;
    private TextView tvWinnerName;
    private TextView tvWinnerScore;
    private TextView tvLoserName;
    private TextView tvLoserScore;
    private Button btnBackToMenu;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_result);

        tvTargetWord = findViewById(R.id.tv_result_target_word);
        tvWinnerName = findViewById(R.id.tv_result_winner_name);
        tvWinnerScore = findViewById(R.id.tv_result_winner_score);
        tvLoserName = findViewById(R.id.tv_result_loser_name);
        tvLoserScore = findViewById(R.id.tv_result_loser_score);
        btnBackToMenu = findViewById(R.id.btn_result_back_to_menu);

        // Extract result data from the incoming intent
        Intent intent = getIntent();
        if (intent != null) {
            String targetWord = intent.getStringExtra("TARGET_WORD");
            String winnerName = intent.getStringExtra("WINNER_NAME");
            int winnerScore = intent.getIntExtra("WINNER_SCORE", 0);
            String loserName = intent.getStringExtra("LOSER_NAME");
            int loserScore = intent.getIntExtra("LOSER_SCORE", 0);

            if (targetWord != null) {
                tvTargetWord.setText("HEDEF KELİME: " + targetWord.toUpperCase());
            }
            if (winnerName != null) {
                tvWinnerName.setText(winnerName);
            }
            tvWinnerScore.setText(winnerScore + " Puan");
            
            if (loserName != null) {
                tvLoserName.setText(loserName);
            }
            tvLoserScore.setText(loserScore + " Puan");
        }

        btnBackToMenu.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Return to MainActivity cleanly
                Intent intent = new Intent(ResultActivity.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
                finish();
            }
        });
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        // Go back to main activity on system back press
        Intent intent = new Intent(ResultActivity.this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
