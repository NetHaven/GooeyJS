import ModelEvent from "../events/mvc/ModelEvent";
import Observable from "../events/Observable";

export default class Model extends Observable {
  constructor(attributes = {}, options = {}) {
    super();

    // Model metadata (inspired by Breeze.js)
    this._metadata = this.constructor.metadata || {};
    this._attributes = {};
    this._originalValues = {};
    this._errors = new Map();
    this._entityState = EntityState.DETACHED;

    // Standard model events
    this.addValidEvent(ModelEvent.CHANGE);
    this.addValidEvent(ModelEvent.SYNC);
    this.addValidEvent(ModelEvent.DESTROY);
    this.addValidEvent(ModelEvent.ERROR);
    this.addValidEvent(ModelEvent.INVALID);

    // Initialize properties from metadata
    this._defineProperties();

    // Set initial attributes
    this.set(attributes, { silent: true });

    // Track changes if enabled
    if (options.tracking !== false) {
      this._enableChangeTracking();
    }
  }

  // Define properties based on metadata
  _defineProperties() {
    Object.entries(this._metadata).forEach(([key, config]) => {
      // Create getter/setter for each property
      Object.defineProperty(this, key, {
        get() {
          return this._attributes[key];
        },
        set(value) {
          this.set(key, value);
        }
      });

      // Register property change event
      this.addValidEvent(`${ModelEvent.PROPERTY_CHANGE_PREFIX}${key}`);
    });
  }

  // Set attributes with validation
  set(key, value, options = {}) {
    let attrs;

    // Handle both set(key, value) and set({key: value})
    if (typeof key === 'object') {
      attrs = key;
      options = value || {};
    } else {
      attrs = { [key]: value };
    }

    // Validate and set each attribute
    Object.entries(attrs).forEach(([k, v]) => {
      const metadata = this._metadata[k];

      if (metadata) {
        // Validation
        if (metadata.validate) {
          const result = metadata.validate(v);
          if (!result.valid) {
            this._errors.set(k, result.message);
            if (!options.silent) {
              this.fireEvent(ModelEvent.INVALID, {
                field: k,
                value: v,
                error: result.message
              });
            }
            return;
          }
        }

        // Type coercion
        if (metadata.type) {
          v = this._coerceType(v, metadata.type);
        }
      }

      const oldValue = this._attributes[k];
      this._attributes[k] = v;

      // Track changes
      if (this._entityState === EntityState.UNCHANGED) {
        this._entityState = EntityState.MODIFIED;
        if (!(k in this._originalValues)) {
          this._originalValues[k] = oldValue;
        }
      }

      // Fire events
      if (!options.silent) {
        this.fireEvent(`${ModelEvent.PROPERTY_CHANGE_PREFIX}${k}`, {
          key: k,
          value: v,
          oldValue
        });
        this.fireEvent(ModelEvent.CHANGE, { changes: { [k]: v } });
      }
    });

    return this;
  }

  // Get attribute value
  get(key) {
    if (key) {
      return this._attributes[key];
    }
    return { ...this._attributes };
  }

  // Validation
  validate() {
    this._errors.clear();

    Object.entries(this._metadata).forEach(([key, config]) => {
      const value = this._attributes[key];

      // Required validation
      if (config.required && (value === undefined || value === null || value === '')) {
        this._errors.set(key, `${key} is required`);
      }

      // Custom validation
      if (config.validate) {
        const result = config.validate(value);
        if (!result.valid) {
          this._errors.set(key, result.message);
        }
      }
    });

    return this._errors.size === 0;
  }

  // Save model
  async save(options = {}) {
    if (!this.validate()) {
      this.fireEvent(ModelEvent.INVALID, { errors: this._errors });
      return false;
    }

    try {
      const adapter = options.adapter || this.constructor.adapter || new RestAdapter();
      const result = await adapter.save(this);

      this.set(result, { silent: true });
      this.acceptChanges();

      this.fireEvent(ModelEvent.SYNC, { action: 'save', data: result });
      return result;
    } catch (error) {
      this.fireEvent(ModelEvent.ERROR, { action: 'save', error });
      throw error;
    }
  }

  // Accept changes (Breeze.js pattern)
  acceptChanges() {
    this._originalValues = {};
    this._entityState = EntityState.UNCHANGED;
    this._errors.clear();
  }

  // Reject changes
  rejectChanges() {
    Object.entries(this._originalValues).forEach(([key, value]) => {
      this._attributes[key] = value;
    });
    this._originalValues = {};
    this._entityState = EntityState.UNCHANGED;
    this._errors.clear();
    this.fireEvent(ModelEvent.CHANGE, { changes: this._attributes });
  }

  // Check if model has changes
  hasChanges() {
    return this._entityState === EntityState.MODIFIED ||
           this._entityState === EntityState.ADDED;
  }

  // Clone model
  clone() {
    return new this.constructor(this.get());
  }

  // Convert to JSON
  toJSON() {
    return this.get();
  }

  // Type coercion helper
  _coerceType(value, type) {
    switch (type) {
      case 'string':
        return value != null ? String(value) : '';
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value : new Date(value);
      default:
        return value;
    }
  }
}