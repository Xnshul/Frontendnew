import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AudioList = () => {
  const [audios, setAudios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [playingId, setPlayingId] = useState(null);
  const audioRefs = useRef({}); 

useEffect(() => {
  const ids = new Set(audios.map(a => a._id));
  Object.keys(audioRefs.current).forEach(id => {
    if (!ids.has(id)) {
      delete audioRefs.current[id];
    }
  });
}, [audios]);

  const itemsPerPage = 4;

  useEffect(() => {
    fetchAudios();
  }, []);

  const fetchAudios = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/audio`);
      setAudios(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/audio/${id}`);
      fetchAudios();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };



const handlePlayPause = (id) => {
  const audio = audioRefs.current[id];

  if (!audio) {
    console.warn(`Audio ref for id ${id} not ready`);
    return;
  }

  if (playingId && playingId !== id) {
    const prevAudio = audioRefs.current[playingId];
    if (prevAudio) {
      prevAudio.pause();
      prevAudio.currentTime = 0;
    }
  }

  if (audio.paused) {
    audio
      .play()
      .then(() => {
        setPlayingId(id);
      })
      .catch((err) => {
        console.error('Play error:', err);
      });
  } else {
    audio.pause();
    setPlayingId(null);
  }
};
  const filteredAudios = audios.filter(audio =>
    audio.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAudios.length / itemsPerPage);
  const paginatedAudios = filteredAudios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 align-item-center text-white">Audio List</h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by title"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 rounded w-full bg-gray-800 text-white border border-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {paginatedAudios.map(audio => (
          <div key={audio._id} className="bg-gray-900 p-4 rounded-lg hover:bg-gray-700 transition-all shadow-md text-white relative">
            <p className="text-lg font-semibold">{audio.title}</p>
            
            <audio
              ref={(el) => (audioRefs.current[audio._id] = el)}
              src={`${API_URL}/api/audio/play/${audio._id}`}
              onEnded={() => setPlayingId(null)}
            />

            <div className="flex justify-between items-center mt-3">
              <button
                onClick={() => handlePlayPause(audio._id)}
                className="bg-transparent hover:bg-purple-700 px-3 py-1 rounded-full"
              >
                {playingId === audio._id ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={() => handleDelete(audio._id)}
                className="bg-transparent hover:bg-red-800 px-3 py-1 rounded-full"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-4 gap-2">
        {[...Array(totalPages).keys()].map(num => (
          <button
            key={num}
            onClick={() => setCurrentPage(num + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === num + 1 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {num + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudioList;