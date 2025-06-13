import React from 'react';

const AudioList = ({ audioList }) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-xl max-w-md mx-auto mt-6 space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-100">📻 Audio Playlist</h2>

      {audioList.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">No recordings found.</p>
      ) : (
        <div className="space-y-4">
          {audioList.map((audio) => (
            <div key={audio._id} className="rounded-md border p-3 bg-gray-50 dark:bg-gray-700">
              <p className="text-md font-semibold text-gray-800 dark:text-gray-100">{audio.title}</p>
              <audio
                controls
                src={audio.url}
                className="w-full mt-2"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioList;
