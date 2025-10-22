'use client';

/**
 * MultiInputWrapper - Reusable component for managing multiple entries
 * Provides add/remove functionality and displays all selected items
 */
export default function MultiInputWrapper({
  title,
  items = [],
  onRemove,
  renderItem,
  children,
  sectionNumber
}) {
  return (
    <div className="form-section">
      <h3>{sectionNumber}. {title}</h3>

      <div className="multi-input-container">
        {/* Input area for adding new items */}
        <div className="multi-input-add-area">
          {children}
        </div>

        {/* Display selected items */}
        {items.length > 0 && (
          <div className="multi-input-selected-items">
            <div className="selected-items-header">
              <span className="items-count">Selected Items ({items.length})</span>
            </div>

            {items.map((item, index) => (
              <div key={index} className="multi-input-item">
                <div className="item-content">
                  <span className="item-number">#{index + 1}</span>
                  {renderItem(item, index)}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="btn-remove-item"
                  title="Remove this item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
