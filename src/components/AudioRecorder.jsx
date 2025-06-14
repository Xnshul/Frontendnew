import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const MAX_DURATION = 30;
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AudioRecorder = ({ onUploadSuccess }) => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [blob, setBlob] = useState(null);
  const [awaitingTitle, setAwaitingTitle] = useState(false);

  const chunks = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let rafId;
    const drawCircularWaveform = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyser = analyserRef.current;
      if (!canvas || !ctx || !analyser) return;

      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) / 3;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.beginPath();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;

      for (let i = 0; i < bufferLength; i++) {
        const angle = (i / bufferLength) * 2 * Math.PI;
        const amplitude = dataArray[i] / 255;
        const x = Math.cos(angle) * (radius + amplitude * 50);
        const y = Math.sin(angle) * (radius + amplitude * 50);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      rafId = requestAnimationFrame(drawCircularWaveform);
    };

    if (recording && analyserRef.current) drawCircularWaveform();
    return () => cancelAnimationFrame(rafId);
  }, [recording]);

  const startRecording = async () => {
    try {
      setTitle('');
      setTags('');
      setAwaitingTitle(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      chunks.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
        setBlob(audioBlob);
        setAwaitingTitle(true);
      };

      recorder.start();
      setRecording(true);
      setPaused(false);
      setTimeLeft(MAX_DURATION);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
    setPaused(false);
    clearInterval(timerRef.current);
  };

  const pauseRecording = () => {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause();
      setPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume();
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

  const cancelRecording = () => {
    stopRecording();
    setBlob(null);
    setTitle('');
    setAwaitingTitle(false);
  };

  const handleUpload = async () => {
    if (!blob || !title) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('tags', tags);
    formData.append('audio', blob, 'recording.webm');
    try {
      await axios.post(`${API_URL}/api/audio`, formData);
      setTitle('');
      setBlob(null);
      setAwaitingTitle(false);
      setTimeLeft(MAX_DURATION);
      onUploadSuccess?.();
      window.dispatchEvent(new Event('audioUploaded'));
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white px-4 py-6">
      <h1 className="text-xl md:text-3xl font-bold mb-4 text-center">Audio Recorder</h1>

      <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 mb-4">
        <canvas
          ref={canvasRef}
          width={250}
          height={250}
          className="rounded-full bg-black w-[250px] h-[250px] md:w-[300px] md:h-[300px]"
        />
      </div>

      {awaitingTitle && (
        <div className="mt-4 w-full max-w-sm flex flex-col gap-3 items-center">
          <input
            type="text"
            placeholder="Enter title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white w-full border border-purple-500"
          />
          <input
            type="text"
            placeholder="Enter tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white w-full border border-purple-500"
          />
          <div className="flex flex-wrap justify-center gap-2 mt-2 w-full">
            <button
              onClick={handleUpload}
              className="w-full sm:w-auto hover:bg-purple-700 bg-transparent text-purple-400 hover:text-black px-4 py-2 rounded-full"
              disabled={!title}
            >
              Submit
            </button>
            <button
              onClick={cancelRecording}
              className="w-full sm:w-auto hover:bg-red-600 text-red-500 hover:text-black bg-transparent px-4 py-2 rounded-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-3 w-full max-w-sm">
        {!recording && !blob && !awaitingTitle && (
          <button onClick={startRecording} className="w-full sm:w-auto hover:bg-green-600 text-green-400 hover:text-black bg-transparent px-4 py-2 rounded-full">
            Start
          </button>
        )}
        {recording && !paused && (
          <>
            <button onClick={pauseRecording} className="hover:bg-yellow-500 text-yellow-400 hover:text-black bg-transparent px-4 py-2 rounded-full">
              Pause
            </button>
            <button onClick={stopRecording} className="hover:bg-blue-600 text-blue-400 hover:text-black bg-transparent px-4 py-2 rounded-full">
              Stop
            </button>
          </>
        )}
        {recording && paused && (
          <>
            <button onClick={resumeRecording} className="hover:bg-blue-500 text-blue-300 hover:text-black bg-transparent px-4 py-2 rounded-full">
              Resume
            </button>
            <button onClick={stopRecording} className="hover:bg-blue-600 text-blue-400 hover:text-black bg-transparent px-4 py-2 rounded-full">
              Stop
            </button>
          </>
        )}
        {(recording || blob) && !awaitingTitle && (
          <button onClick={cancelRecording} className="hover:bg-red-600 text-red-500 hover:text-black bg-transparent px-4 py-2 rounded-full">
            Cancel
          </button>
        )}
      </div>

      {recording && (
        <div className="mt-2 text-sm text-purple-300">Time left: {timeLeft}s</div>
      )}
    </div>
  );
};

export default AudioRecorder;
