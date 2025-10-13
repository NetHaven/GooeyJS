import CollectionEvent from "../events/mvc/CollectionEvent.js";
import Model from "./Model.js";
import Observable from "../events/Observable";

export default class Collection extends Observable {
  constructor(models = [], options = {}) {
    super();

    this.models = [];
    this.modelClass = options.modelClass || Model;
    this._byId = new Map();
    this._byCid = new Map();

    // Collection events
    this.addValidEvent(CollectionEvent.ADD);
    this.addValidEvent(CollectionEvent.REMOVE);
    this.addValidEvent(CollectionEvent.RESET);
    this.addValidEvent(CollectionEvent.SORT);
    this.addValidEvent(CollectionEvent.UPDATE);
    this.addValidEvent(CollectionEvent.SYNC);
    this.addValidEvent(CollectionEvent.ERROR);

    // Sorting and filtering
    this.comparator = options.comparator;
    this.filters = options.filters || [];

    // Add initial models
    if (models.length > 0) {
      this.add(models, { silent: true });
    }
  }

  // Add models to collection
  add(models, options = {}) {
    if (!Array.isArray(models)) {
      models = [models];
    }

    const added = [];

    models.forEach(model => {
      // Create model instance if needed
      if (!(model instanceof Model)) {
        model = new this.modelClass(model);
      }

      // Skip if already in collection
      if (this._byId.has(model.id) || this._byCid.has(model.cid)) {
        return;
      }

      // Add to collection
      this.models.push(model);

      if (model.id != null) {
        this._byId.set(model.id, model);
      }
      this._byCid.set(model.cid, model);

      // Listen to model changes
      model.on(ModelEvent.CHANGE, this._onModelChange.bind(this, model));
      model.on(ModelEvent.DESTROY, this._onModelDestroy.bind(this, model));

      added.push(model);

      if (!options.silent) {
        this.fireEvent(CollectionEvent.ADD, { model, collection: this });
      }
    });

    // Sort if comparator exists
    if (this.comparator && !options.sort) {
      this.sort({ silent: true });
    }

    if (added.length > 0 && !options.silent) {
      this.fireEvent(CollectionEvent.UPDATE, { added, removed: [], changed: [] });
    }

    return added;
  }

  // Remove models from collection
  remove(models, options = {}) {
    if (!Array.isArray(models)) {
      models = [models];
    }

    const removed = [];

    models.forEach(model => {
      // Find model by id or cid
      if (typeof model === 'string' || typeof model === 'number') {
        model = this.get(model);
      }

      if (!model) return;

      const index = this.models.indexOf(model);
      if (index === -1) return;

      // Remove from collection
      this.models.splice(index, 1);

      if (model.id != null) {
        this._byId.delete(model.id);
      }
      this._byCid.delete(model.cid);

      // Stop listening to model
      model.off(ModelEvent.CHANGE, this._onModelChange);
      model.off(ModelEvent.DESTROY, this._onModelDestroy);

      removed.push(model);

      if (!options.silent) {
        this.fireEvent(CollectionEvent.REMOVE, { model, collection: this });
      }
    });

    if (removed.length > 0 && !options.silent) {
      this.fireEvent(CollectionEvent.UPDATE, { added: [], removed, changed: [] });
    }

    return removed;
  }

  // Get model by id or cid
  get(id) {
    return this._byId.get(id) || this._byCid.get(id);
  }

  // Get model at index
  at(index) {
    return this.models[index];
  }

  // Find models matching criteria
  where(attrs) {
    return this.models.filter(model => {
      return Object.entries(attrs).every(([key, value]) => {
        return model.get(key) === value;
      });
    });
  }

  // Find first model matching criteria
  findWhere(attrs) {
    return this.models.find(model => {
      return Object.entries(attrs).every(([key, value]) => {
        return model.get(key) === value;
      });
    });
  }

  // Sort collection
  sort(options = {}) {
    if (!this.comparator) {
      throw new Error('Cannot sort without comparator');
    }

    this.models.sort(this.comparator);

    if (!options.silent) {
      this.fireEvent(CollectionEvent.SORT, { collection: this });
    }

    return this;
  }

  // Reset collection with new models
  reset(models = [], options = {}) {
    // Clear existing models
    this.models.forEach(model => {
      model.off(ModelEvent.CHANGE, this._onModelChange);
      model.off(ModelEvent.DESTROY, this._onModelDestroy);
    });

    this.models = [];
    this._byId.clear();
    this._byCid.clear();

    // Add new models
    if (models.length > 0) {
      this.add(models, { silent: true });
    }

    if (!options.silent) {
      this.fireEvent(CollectionEvent.RESET, { collection: this });
    }

    return this;
  }

  // Filter collection (returns new collection)
  filter(predicate) {
    const filtered = this.models.filter(predicate);
    return new this.constructor(filtered, {
      modelClass: this.modelClass,
      comparator: this.comparator
    });
  }

  // Map over models
  map(iteratee) {
    return this.models.map(iteratee);
  }

  // Pluck attribute from all models
  pluck(attr) {
    return this.models.map(model => model.get(attr));
  }

  // Get collection length
  get length() {
    return this.models.length;
  }

  // Check if collection is empty
  isEmpty() {
    return this.models.length === 0;
  }

  // Convert to JSON
  toJSON() {
    return this.models.map(model => model.toJSON());
  }

  // Handle model change
  _onModelChange(model) {
    this.fireEvent(CollectionEvent.UPDATE, {
      added: [],
      removed: [],
      changed: [model]
    });
  }

  // Handle model destroy
  _onModelDestroy(model) {
    this.remove(model);
  }

  // Fetch collection from server
  async fetch(options = {}) {
    try {
      const adapter = options.adapter || this.constructor.adapter || new RestAdapter();
      const data = await adapter.fetchCollection(this, options);

      this.reset(data);
      this.fireEvent(CollectionEvent.SYNC, { action: 'fetch', data });

      return data;
    } catch (error) {
      this.fireEvent(CollectionEvent.ERROR, { action: 'fetch', error });
      throw error;
    }
  }

  // Save all modified models
  async save() {
    const promises = this.models
      .filter(model => model.hasChanges())
      .map(model => model.save());

    return Promise.all(promises);
  }
}

// Client ID counter for models without IDs
let cidCounter = 0;

// Extend GooeyModel with client ID
Object.defineProperty(Model.prototype, 'cid', {
  get() {
    if (!this._cid) {
      this._cid = `c${++cidCounter}`;
    }
    return this._cid;
  }
});
