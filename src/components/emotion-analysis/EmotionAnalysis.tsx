import React, { useEffect, useState } from 'react';
import Sentiment from 'sentiment';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const sentiment = new Sentiment();

const EmotionAnalysis = ({ query }) => {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (query) {
      const result = sentiment.analyze(query);
      setAnalysis(result);
    }
  }, [query]);

  const data = {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [
      {
        label: 'Sentiment Score',
        data: [
          analysis?.positive.length || 0,
          analysis?.negative.length || 0,
          analysis?.neutral.length || 0,
        ],
        backgroundColor: ['#4caf50', '#f44336', '#ffeb3b'],
      },
    ],
  };

  return (
    <div>
      <h3>Emotion Analysis</h3>
      {analysis ? (
        <Bar data={data} />
      ) : (
        <p>Enter a query to analyze emotions.</p>
      )}
    </div>
  );
};

export default EmotionAnalysis;
