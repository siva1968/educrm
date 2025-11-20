const { sequelize, Sequelize } = require('./index');
const fs = require('fs');
const path = require('path');

/**
 * Model Loader
 * Dynamically loads all Sequelize models and sets up associations
 */

const models = {};
const modelsPath = __dirname;

// Load all model files
fs.readdirSync(modelsPath)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file !== 'loader.js' &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(modelsPath, file))(sequelize);
    models[model.name] = model;
  });

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize instance
module.exports = {
  ...models,
  sequelize,
  Sequelize,
};
