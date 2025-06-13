import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const MAX_DURATION = 31;
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.PORT;

const AudioRecorder = ({ onUploadSuccess }) => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [title, setTitle] = useState('');
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION);
  const [awaitingTitle, setAwaitingTitle] = useState(false);
  const [blob, setBlob] = useState(null);
  const chunks = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // Visualization
  useEffect(() => {
    let rafId;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const analyser = analyserRef.current;
      if (!canvas || !ctx || !analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        ctx.fillStyle = `hsl(${i % 360}, 100%, 60%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      rafId = requestAnimationFrame(draw);
    };

    if (recording) draw();
    return () => cancelAnimationFrame(rafId);
  }, [recording]);

  const startRecording = async () => {
    try {
      setTitle('');
      setBlob(null);
      setAwaitingTitle(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
        setBlob(audioBlob);
        setAwaitingTitle(true); // ✅ Now the title input shows
      };

      mediaRecorder.start();
      setRecording(true);
      setTimeLeft(MAX_DURATION);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording(); // ✅ Stop triggers .onstop
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // ✅ this triggers .onstop and sets blob + awaitingTitle
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    setPaused(false);
    clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    stopRecording();
    setTitle('');
    setBlob(null);
    setAwaitingTitle(false);
    setTimeLeft(MAX_DURATION);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleUpload = async () => {
    if (!title || !blob) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('audio', blob, 'recording.webm');

    try {
      await axios.post(`${API_URL}/api/audio`, formData);
      setTitle('');
      setBlob(null);
      setAwaitingTitle(false);
      setTimeLeft(MAX_DURATION);
      onUploadSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-xl max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-100">🎤 Audio Recorder</h2>

      {awaitingTitle && (
        <input
          className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
          placeholder="Enter a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      )}

      <canvas
        ref={canvasRef}
        width={300}
        height={80}
        className="w-full rounded bg-gray-100 dark:bg-gray-700"
      />

      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
        <div
          className="bg-blue-500 h-2.5 rounded-full"
          style={{ width: `${((MAX_DURATION - timeLeft) / MAX_DURATION) * 100}%` }}
        ></div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {!recording && !blob && !awaitingTitle && (
          <button
            onClick={startRecording}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Start
          </button>
        )}

        {recording && !paused && (
          <>
            <button
              onClick={pauseRecording}
              className="bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
            >
              Pause
            </button>
            <button
              onClick={stopRecording}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Stop
            </button>
          </>
        )}

        {recording && paused && (
          <>
            <button
              onClick={resumeRecording}
              className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
            >
              Resume
            </button>
            <button
              onClick={stopRecording}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Stop
            </button>
          </>
        )}

        {(recording || blob || awaitingTitle) && (
          <button
            onClick={cancelRecording}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cancel
          </button>
        )}

        {awaitingTitle && blob && (
          <button
            onClick={handleUpload}
            disabled={!title}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 hover:white"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
