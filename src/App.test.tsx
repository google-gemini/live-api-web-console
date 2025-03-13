/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import EmotionAnalysis from './components/emotion-analysis/EmotionAnalysis';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders EmotionAnalysis component', () => {
  render(<EmotionAnalysis query="I am happy" />);
  const analysisElement = screen.getByText(/Emotion Analysis/i);
  expect(analysisElement).toBeInTheDocument();
});

test('displays sentiment analysis results', () => {
  render(<EmotionAnalysis query="I am happy" />);
  const positiveLabel = screen.getByText(/Positive/i);
  const negativeLabel = screen.getByText(/Negative/i);
  const neutralLabel = screen.getByText(/Neutral/i);
  expect(positiveLabel).toBeInTheDocument();
  expect(negativeLabel).toBeInTheDocument();
  expect(neutralLabel).toBeInTheDocument();
});
