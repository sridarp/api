(function() {
  'use strict';

  angular.module('app.components')
    .directive('catalogCategory', CatalogCategoryDirective);

  /** @ngInject */
  function CatalogCategoryDirective() {
    var directive = {
      restrict: 'AE',
      scope: {
        category: '=',
        viewMode: '=?',
        collapsed: '=?',
        comparable: '=?',
        projectId: '=?'
      },
      link: link,
      templateUrl: 'app/components/catalog/catalog-category.html',
      controller: CatalogCategoryController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    function link(scope, element, attrs, vm, transclude) {
      vm.activate();
    }

    /** @ngInject */
    function CatalogCategoryController(VIEW_MODES, CartProjectHelper, CartService) {
      var vm = this;

      vm.activate = activate;
      vm.addToCart = addToCart;

      function activate() {
        vm.viewMode = vm.viewMode || VIEW_MODES.list;
        vm.collapsed = angular.isDefined(vm.collapsed) ? vm.collapsed : false;
        vm.requiredTags = vm.requiredTags || [];
        vm.comparable = angular.isDefined(vm.comparable) ? vm.comparable : true;
      }

      function addToCart(product) {
        vm.addToProject = vm.projectId ? vm.projectId : CartService.defaultProject();
        if (vm.addToProject) {
          CartService.add(vm.addToProject, product);
        } else {
          CartProjectHelper.showModal(vm.projectId, product);
        }
      }
    }
  }
})();
