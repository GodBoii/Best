'use client';

export default function ModifyModal({ 
  show, 
  onClose, 
  title, 
  fields, 
  onSave, 
  loading 
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {fields.map((field, index) => (
            <div key={index} className="modal-form-group">
              <label>{field.label}</label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className={field.className}
                autoFocus={index === 0}
              />
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
