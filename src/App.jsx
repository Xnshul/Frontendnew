import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AudioRecorder from './components/AudioRecorder';
import AudioList from './components/AudioList';

const App = () => {
  const [audioList, setAudioList] = useState([]);

  const fetchAudioList = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/audio`);
      setAudioList(res.data);
    } catch (err) {
      console.error('Failed to fetch audio list:', err);
    }
  };

  useEffect(() => {
    fetchAudioList();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <AudioRecorder onUploadSuccess={fetchAudioList} />
      <AudioList audioList={audioList} />
    </div>
  );
};

export default App;
