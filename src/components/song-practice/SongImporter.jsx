import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseImportedSongs } from './utils/songParser';
import { addSongs, getAllTags } from './utils/songStorage';

const SongImporter = ({ onClose, onImportComplete }) => {
  const [importText, setImportText] = useState('');
  const [parsedSongs, setParsedSongs] = useState([]);
  const [commonTags, setCommonTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importStatus, setImportStatus] = useState('idle'); // idle, parsed, importing, complete

  React.useEffect(() => {
    setAvailableTags(getAllTags());
  }, []);

  const handleParse = () => {
    try {
      const data = JSON.parse(importText);
      const songs = Array.isArray(data) ? data : [data];
      const parsed = parseImportedSongs(songs);

      if (parsed.length === 0) {
        setErrors(['No valid songs found in the input']);
        return;
      }

      setParsedSongs(parsed);
      setImportStatus('parsed');
      setErrors([]);
    } catch (error) {
      setErrors([`Failed to parse JSON: ${error.message}`]);
    }
  };

  const handleImport = () => {
    setImportStatus('importing');

    try {
      // Add common tags to all songs
      const songsWithTags = parsedSongs.map(song => ({
        ...song,
        tags: [...(song.tags || []), ...commonTags]
      }));

      const addedIds = addSongs(songsWithTags);

      setImportStatus('complete');

      // Call completion callback after a short delay
      setTimeout(() => {
        onImportComplete(addedIds.length);
        onClose();
      }, 1500);
    } catch (error) {
      setErrors([`Failed to import songs: ${error.message}`]);
      setImportStatus('parsed');
    }
  };

  const toggleTag = (tag) => {
    setCommonTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = prompt('Enter custom tag name:');
    if (tag && tag.trim()) {
      const trimmedTag = tag.trim();
      if (!availableTags.includes(trimmedTag)) {
        setAvailableTags(prev => [...prev, trimmedTag].sort());
      }
      if (!commonTags.includes(trimmedTag)) {
        setCommonTags(prev => [...prev, trimmedTag]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-buretto-primary">Import Songs</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={importStatus === 'importing'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          {importStatus === 'idle' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Import Format</h3>
              <p className="text-sm text-blue-700 mb-2">
                Paste JSON data in the following format:
              </p>
              <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
{`{
  "title": "Song Name",
  "artist": "Artist Name", // optional
  "tags": ["genre", "difficulty"], // optional
  "sequence": [
    {
      "startTime": 0,
      "duration": 1,
      "expectedNotes": [60, 64, 67], // MIDI notes
      "clef": "treble",
      "notes": [
        { "note": "C", "octave": 4 },
        { "note": "E", "octave": 4 },
        { "note": "G", "octave": 4 }
      ]
    }
    // ... more notes
  ]
}`}
              </pre>
              <p className="text-xs text-blue-600 mt-2">
                You can also import an array of songs: <code>[song1, song2, ...]</code>
              </p>
            </div>
          )}

          {/* Input Area */}
          {importStatus === 'idle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Song Data (JSON)
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste JSON data here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary font-mono text-sm"
                rows={12}
              />
              <button
                onClick={handleParse}
                disabled={!importText.trim()}
                className="mt-3 px-6 py-2 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Parse Songs
              </button>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="text-red-600 mt-0.5" size={18} />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-1">Import Errors</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => {
                  setErrors([]);
                  setImportStatus('idle');
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Parsed Songs */}
          {importStatus === 'parsed' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle size={18} />
                  <span className="font-semibold">
                    Successfully parsed {parsedSongs.length} song{parsedSongs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Tag Selection */}
              <div className="border border-gray-300 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Tags (optional - applied to all imported songs)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                        commonTags.includes(tag)
                          ? 'bg-buretto-secondary text-white border-buretto-secondary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-buretto-secondary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button
                  onClick={addCustomTag}
                  className="text-sm text-buretto-secondary hover:text-buretto-primary transition-colors"
                >
                  + Add Custom Tag
                </button>
              </div>

              {/* Song Preview */}
              <div className="border border-gray-300 rounded-lg p-4">
                <h4 className="font-semibold text-buretto-primary mb-3">Songs to Import:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedSongs.map((song, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded">
                      <div className="font-medium">{song.title}</div>
                      {song.artist && (
                        <div className="text-sm text-gray-600">{song.artist}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {song.variants.length} variant{song.variants.length !== 1 ? 's' : ''} •
                        {song.variants[0].sequence.length} notes
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Importing Status */}
          {importStatus === 'importing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-buretto-secondary border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Importing songs...</p>
            </div>
          )}

          {/* Complete Status */}
          {importStatus === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800">Import Complete!</h3>
              <p className="text-gray-600 mt-2">
                Successfully imported {parsedSongs.length} song{parsedSongs.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {importStatus === 'parsed' && (
          <div className="p-6 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleImport}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Import {parsedSongs.length} Song{parsedSongs.length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => {
                setImportStatus('idle');
                setParsedSongs([]);
                setCommonTags([]);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongImporter;
