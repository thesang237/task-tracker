import { useState, useCallback, useRef, useEffect } from 'react';
import type { Category } from '../types';
import { useTaskContext } from '../context/TaskContext';
import './CategorySelect.scss';

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  onAddCategory: (name: string, color?: string) => void;
}

const PRESET_COLORS = [
  '#ff4d4d', '#ff9933', '#ffd633', '#4dff4d', '#33ccff', '#4d79ff', '#b366ff', '#ff66b3', '#888888'
];

export function CategorySelect({ categories, value, onChange, onAddCategory }: CategorySelectProps) {
  const { updateCategory, deleteCategory } = useTaskContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const selectedCategory = categories.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingColorId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = useCallback(() => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setIsAdding(false);
      setNewCategoryColor(PRESET_COLORS[0]);
    }
  }, [newCategoryName, newCategoryColor, onAddCategory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCategoryName('');
    }
  }, [handleAddCategory]);

  return (
    <div className="category-select" ref={dropdownRef}>
      <label className="category-select__label">Category</label>

      <div 
        className={`category-select__trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="category-select__trigger-content">
          {selectedCategory ? (
            <>
              <span 
                className="category-select__color-dot" 
                style={{ backgroundColor: selectedCategory.color || '#888888' }} 
              />
              {selectedCategory.name}
            </>
          ) : 'Select a category'}
        </span>
        <span className="category-select__arrow">▼</span>
      </div>

      {isOpen && (
        <div className="category-select__dropdown-menu">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className={`category-select__item ${category.id === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(category.id);
                setIsOpen(false);
              }}
            >
              <div 
                className="category-select__color-wrapper"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColorId(category.id === editingColorId ? null : category.id);
                }}
              >
                <span 
                  className="category-select__color-dot editable" 
                  style={{ backgroundColor: category.color || '#888888' }} 
                />
                {editingColorId === category.id && (
                  <div className="category-select__color-palette" onClick={e => e.stopPropagation()}>
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        className="category-select__color-option"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCategory(category.id, { color });
                          setEditingColorId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="category-select__item-name">{category.name}</span>
              <button
                type="button"
                className="category-select__delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategory(category.id);
                  if (value === category.id) {
                    onChange('');
                  }
                }}
                title="Delete category"
              >
                ✕
              </button>
            </div>
          ))}

          {isAdding ? (
            <div className="category-select__add-row" onClick={e => e.stopPropagation()}>
              <div className="category-select__color-wrapper">
                <span 
                  className="category-select__color-dot editable" 
                  style={{ backgroundColor: newCategoryColor }} 
                  onClick={() => setEditingColorId('new')}
                />
                {editingColorId === 'new' && (
                  <div className="category-select__color-palette palette-up" onClick={e => e.stopPropagation()}>
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        className="category-select__color-option"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewCategoryColor(color);
                          setEditingColorId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Category name"
                className="category-select__add-input"
                autoFocus
              />
              <button
                type="button"
                className="category-select__save-btn"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                ✓
              </button>
              <button
                type="button"
                className="category-select__cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategoryName('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div 
              className="category-select__add-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(true);
              }}
            >
              <span className="category-select__add-icon">+</span>
              New Category
            </div>
          )}
        </div>
      )}
    </div>
  );
}
