import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseImportedSongs } from './utils/songParser';
import { addSongs, getAllTags, getAllArtists } from './utils/songStorage';
import { parseFile, getSupportedFileFormats } from './utils/fileFormatParsers';

const SongImporter = ({ onClose, onImportComplete }) => {
  const [importText, setImportText] = useState('');
  const [parsedSongs, setParsedSongs] = useState([]);
  const [commonTags, setCommonTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableArtists, setAvailableArtists] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importStatus, setImportStatus] = useState('idle'); // idle, parsed, importing, complete
  const [importMode, setImportMode] = useState('file'); // 'file' or 'json'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [artist, setArtist] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  React.useEffect(() => {
    setAvailableTags(getAllTags());
    setAvailableArtists(getAllArtists());
  }, []);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    if (files.length === 0) return;

    setImportStatus('parsing');
    setErrors([]);

    try {
      const parsedSongsPromises = files.map(file => parseFile(file));
      const parsedSongsData = await Promise.all(parsedSongsPromises);

      // Convert to song format and apply artist/tags
      const songs = parsedSongsData.map(songData => ({
        ...songData,
        artist: artist || null,
        tags: [...commonTags]
      }));

      const parsed = parseImportedSongs(songs);

      if (parsed.length === 0) {
        setErrors(['No valid songs found in the files']);
        setImportStatus('idle');
        return;
      }

      setParsedSongs(parsed);
      setImportStatus('parsed');
      setErrors([]);
    } catch (error) {
      setErrors([`Failed to parse files: ${error.message}`]);
      setImportStatus('idle');
    }
  };

  const handleParse = () => {
    try {
      const data = JSON.parse(importText);
      const songs = Array.isArray(data) ? data : [data];

      // Apply artist and tags to JSON imports
      const songsWithMetadata = songs.map(song => ({
        ...song,
        artist: artist || song.artist || null,
        tags: [...(song.tags || []), ...commonTags]
      }));

      const parsed = parseImportedSongs(songsWithMetadata);

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
      // Songs already have artist and tags applied from parsing
      const addedIds = addSongs(parsedSongs);

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

  const handleArtistInputChange = (e) => {
    const value = e.target.value;
    setArtistInput(value);
    setShowArtistSuggestions(value.length > 0);
  };

  const selectArtist = (selectedArtist) => {
    setArtist(selectedArtist);
    setArtistInput(selectedArtist);
    setShowArtistSuggestions(false);
  };

  const handleArtistBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowArtistSuggestions(false);
      // Set the artist to whatever is in the input
      setArtist(artistInput.trim());
    }, 200);
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
    setShowTagSuggestions(value.length > 0);
  };

  const addTagFromInput = (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    // Normalize to match existing tags (case-insensitive)
    const normalizedTag = availableTags.find(
      t => t.toLowerCase() === trimmedTag.toLowerCase()
    ) || trimmedTag;

    if (!commonTags.includes(normalizedTag)) {
      setCommonTags(prev => [...prev, normalizedTag]);
      if (!availableTags.includes(normalizedTag)) {
        setAvailableTags(prev => [...prev, normalizedTag].sort());
      }
    }

    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFromInput(tagInput);
    }
  };

  const handleTagBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowTagSuggestions(false);
      if (tagInput.trim()) {
        addTagFromInput(tagInput);
      }
    }, 200);
  };

  const removeTag = (tagToRemove) => {
    setCommonTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const getFilteredArtists = () => {
    if (!artistInput) return [];
    const lowerInput = artistInput.toLowerCase();
    return availableArtists.filter(a =>
      a.toLowerCase().includes(lowerInput)
    ).slice(0, 5);
  };

  const getFilteredTags = () => {
    if (!tagInput) return [];
    const lowerInput = tagInput.toLowerCase();
    return availableTags.filter(t =>
      t.toLowerCase().includes(lowerInput) && !commonTags.includes(t)
    ).slice(0, 8);
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
          {/* Artist and Tags Input (shown in idle and parsing states) */}
          {(importStatus === 'idle' || importStatus === 'parsing') && (
            <div className="space-y-4">
              {/* Artist Input with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artist (optional - applies to all imported songs)
                </label>
                <input
                  type="text"
                  value={artistInput}
                  onChange={handleArtistInputChange}
                  onBlur={handleArtistBlur}
                  onFocus={() => artistInput && setShowArtistSuggestions(true)}
                  placeholder="Enter artist name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
                />
                {showArtistSuggestions && getFilteredArtists().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {getFilteredArtists().map(artistName => (
                      <button
                        key={artistName}
                        onMouseDown={() => selectArtist(artistName)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                      >
                        {artistName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Input with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (optional - applies to all imported songs)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {commonTags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-buretto-secondary text-white rounded-lg text-sm flex items-center space-x-1"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-gray-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={handleTagBlur}
                  onFocus={() => tagInput && setShowTagSuggestions(true)}
                  placeholder="Add tags (press Enter or comma to add)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
                />
                {showTagSuggestions && getFilteredTags().length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {getFilteredTags().map(tagName => (
                      <button
                        key={tagName}
                        onMouseDown={() => addTagFromInput(tagName)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                      >
                        {tagName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          {importStatus === 'idle' && (
            <div className="flex space-x-2 border-b border-gray-200">
              <button
                onClick={() => setImportMode('file')}
                className={`px-4 py-2 font-medium transition-colors ${
                  importMode === 'file'
                    ? 'text-buretto-secondary border-b-2 border-buretto-secondary'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Import from File
              </button>
              <button
                onClick={() => setImportMode('json')}
                className={`px-4 py-2 font-medium transition-colors ${
                  importMode === 'json'
                    ? 'text-buretto-secondary border-b-2 border-buretto-secondary'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Import from JSON
              </button>
            </div>
          )}

          {/* File Upload Mode */}
          {importStatus === 'idle' && importMode === 'file' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">Supported Formats</h3>
                <p className="text-sm text-blue-700">
                  Upload MusicXML (.xml, .musicxml) or MIDI (.mid, .midi) files.
                  You can select multiple files to import at once.
                </p>
              </div>
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-buretto-secondary transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-700 mb-1">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    MusicXML (.xml, .musicxml) or MIDI (.mid, .midi)
                  </p>
                </div>
                <input
                  type="file"
                  accept={getSupportedFileFormats()}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  Selected: {selectedFiles.map(f => f.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* JSON Input Mode */}
          {importStatus === 'idle' && importMode === 'json' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">JSON Import Format</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Paste JSON data in the following format:
                </p>
                <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
{`{
  "title": "Song Name",
  "sequence": [
    {
      "startTime": 0,
      "duration": 1,
      "expectedNotes": [60, 64, 67],
      "clef": "treble",
      "notes": [
        { "note": "C", "octave": 4 },
        { "note": "E", "octave": 4 },
        { "note": "G", "octave": 4 }
      ]
    }
  ]
}`}
                </pre>
                <p className="text-xs text-blue-600 mt-2">
                  Array of songs: <code>[song1, song2, ...]</code>
                </p>
              </div>
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

          {/* Parsing Status */}
          {importStatus === 'parsing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-buretto-secondary border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Parsing files...</p>
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

              {/* Applied Tags Display */}
              {(artist || commonTags.length > 0) && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h4 className="font-semibold text-buretto-primary mb-2">Applied Metadata:</h4>
                  {artist && (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">Artist:</span> {artist}
                    </div>
                  )}
                  {commonTags.length > 0 && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Tags:</span> {commonTags.join(', ')}
                    </div>
                  )}
                </div>
              )}

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
