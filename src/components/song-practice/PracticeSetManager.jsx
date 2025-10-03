import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  getPracticeSets,
  createPracticeSet,
  updatePracticeSet,
  deletePracticeSet,
  getAllTags
} from './utils/songStorage';
import { calculatePracticeSetProgress } from './utils/songProgressTracker';

const PracticeSetManager = ({ onClose }) => {
  const [practiceSets, setPracticeSets] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [newSetTags, setNewSetTags] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPracticeSets(getPracticeSets());
    setAvailableTags(getAllTags());
  };

  const handleCreateSet = () => {
    if (!newSetName.trim() || newSetTags.length === 0) {
      alert('Please provide a name and select at least one tag');
      return;
    }

    createPracticeSet(newSetName.trim(), newSetTags, newSetDescription.trim());
    setNewSetName('');
    setNewSetDescription('');
    setNewSetTags([]);
    setShowCreateForm(false);
    loadData();
  };

  const handleDeleteSet = (setId) => {
    if (confirm('Are you sure you want to delete this practice set?')) {
      deletePracticeSet(setId);
      loadData();
    }
  };

  const toggleTag = (tag) => {
    setNewSetTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-buretto-primary">Manage Practice Sets</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create New Set */}
          <div>
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                <Plus size={18} />
                <span>Create New Practice Set</span>
              </button>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Practice Set Name"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
                  rows={2}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Tags (songs must have ALL selected tags)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                          newSetTags.includes(tag)
                            ? 'bg-buretto-secondary text-white border-buretto-secondary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-buretto-secondary'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateSet}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewSetName('');
                      setNewSetDescription('');
                      setNewSetTags([]);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Practice Sets */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-buretto-primary">Your Practice Sets</h3>
            {Object.values(practiceSets).map(set => {
              const progress = calculatePracticeSetProgress(set.id);

              return (
                <div key={set.id} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-buretto-primary">{set.name}</h4>
                      {set.description && (
                        <p className="text-sm text-gray-600 mt-1">{set.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {set.tagFilters.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!set.isDefault && (
                      <button
                        onClick={() => handleDeleteSet(set.id)}
                        className="text-red-600 hover:text-red-700 transition-colors ml-3"
                        title="Delete practice set"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress.completed}/{progress.total} songs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress.percentage * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-buretto-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeSetManager;
