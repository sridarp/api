'use strict';

/**@ngInject*/
var ProjectServicesController = function($scope, $modalInstance, CartService, project, products, categories, currentUser) {
  this.CartService = CartService;
  this.project = project;
  this.CurrentUser = currentUser;

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  /**
   * @todo This mirrors the marketplace controller currently
   *       and very close to the admin/products page.
   *       Perhaps we could wrap it up into a service/factory better.
   */
  this.categories = categories;
  // Only display non deleted products.
  this.products = _.filter(products, function(product) {
    return product.deleted_at === null;
  });

  _.each(this.categories, _.bind(function(category) {
    category.products = _.filter(this.products, function(product) {
      return product.product_category_id == category.id;
    });
  }, this));
};

ProjectServicesController.resolve = {
  /**@ngInject*/
  categories: function(ProductCategoryResource) {
    return ProductCategoryResource.query().$promise;
  }
};

ProjectServicesController.prototype = {

  addToCart: function(product) {
    this.CartService.add(this.CurrentUser, this.project, product);
  },

  cartCount: function(projectId, productId) {
    var cartItems = this.CartService.getItems();

    var filtered = _.filter(cartItems, function(item) {
      return (item.product.id == productId && item.project.id == projectId);
    });

    return filtered.length;
  }
};

module.exports = ProjectServicesController;