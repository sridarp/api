(function() {
  'use strict';

  angular.module('app.components')
    .factory('CartService', CartServiceFactory);

  /** @ngInject */
  function CartServiceFactory(Toasts, $modal, lodash, SelectedProjectHelper) {
    var service = {
      projects: {},
      itemCountTotal: 0,
      add: add,
      remove: remove,
      clear: clear,
      isEmpty: isEmpty,
      showModal: showModal
    };

    return service;

    function add(project, product) {
      var projectId = project.id;
      if (angular.isUndefined(service.projects[projectId])) {
        service.projects[projectId] = {
          projectDetails: SelectedProjectHelper.selectedProject,
          products: {},
          productCount: 0
        };
      }

      service.itemCountTotal += 1;

      var cartId = lodash.size(service.projects[projectId].products) + 1;
      service.projects[projectId].products[cartId] = {
        product: lodash.cloneDeep(product),
        price: 0,
        service: {
          name: ''
        }
      };
      service.projects[projectId].productCount = lodash.size(service.projects[projectId].products);
      totalUpProject(SelectedProjectHelper.selectedProject);
      service.projects[projectId].products[cartId].product.cartId = cartId;
      Toasts.toast(product.name + ' has been add to your cart under ' + SelectedProjectHelper.selectedProject.name);
    }

    function remove(project, productObj) {
      var projectId = project.id;
      if (!productObj) {
        service.itemCountTotal -= lodash.size(service.projects[projectId].products);
        delete service.projects[projectId];

        return;
      } else {
        if (!inCart(project, productObj.product)) {
          return;
        }
        service.itemCountTotal -= 1;

        delete service.projects[projectId].products[productObj.product.cartId];
        if (0 === Object.keys(service.projects[projectId].products).length) {
          delete service.projects[projectId];
        }
      }
      if (service.projects[projectId]) {
        service.projects[projectId].productCount = lodash.size(service.projects[projectId].products) || 0;
      }
      totalUpProject(project);
    }

    function clear() {
      service.projects = {};
      service.itemCountTotal = 0;
    }

    function isEmpty() {
      return 0 === Object.keys(service.projects).length;
    }

    function showModal() {
      var modalOptions = {
        templateUrl: 'app/components/cart/cart-modal.html',
        controller: CartModalController,
        controllerAs: 'vm',
        windowTemplateUrl: 'app/components/common/modal-window.html'
      };

      var modal = $modal.open(modalOptions);
    }

    function inCart(project, product) {
      return service.projects[project.id] && service.projects[project.id].products[product.cartId];
    }

    function totalUpProject(project) {
      if (angular.isUndefined(service.projects[project.id])) {
        return;
      }

      service.projects[project.id].total = 0;
      angular.forEach(service.projects[project.id].products, computeProductTotal);
      function computeProductTotal(line) {
        line.price = (parseFloat(line.product.monthly_price)) + ((parseFloat(line.product.hourly_price)) * 750);
        service.projects[project.id].total += line.price;
      }
    }
  }

  /** @ngInject */
  function CartModalController(CartService, ProductHelper, $modalInstance,
                               Toasts, Order, lodash, SelectedProjectHelper, $scope) {
    var vm = this;
    $scope.Object = Object;

    vm.remove = remove;
    vm.clear = clear;
    vm.checkout = checkout;
    vm.configure = configure;
    vm.isEmpty = isEmpty;
    vm.resetDefaultProject = resetDefaultProject;
    vm.tabSelected = tabSelected;
    vm.projects = CartService.projects;

    function remove(project, product) {
      CartService.remove(project, product);
    }

    function clear() {
      CartService.clear();
    }

    function checkout() {
      var projectOrder = {};
      projectOrder.products = [];
      var selectedProject = SelectedProjectHelper.selectedProject.id;
      var projectObject = CartService.projects[selectedProject];
      var allProductsConfigured = lodash.filter(projectObject.products, emptyName);

      if (lodash.isEmpty(allProductsConfigured)) {
        if (projectObject.projectDetails.budget >= projectObject.total) {
          projectOrder.project_id = selectedProject;
          lodash.forEach(projectObject.products, buildOrderList);
          Order.save(projectOrder, saveSuccess, saveError);
        } else {
          Toasts.error('Cart total exceeds project budget, cannot process order.');
        }
      } else {
        Toasts.error('Please confirm all products are configured prior to placing an order.');
      }

      function saveSuccess() {
        CartService.remove(projectObject.project);
        Toasts.toast('Order accepted.');
      }

      function saveError() {
        Toasts.error('Could not place order at this time.');
      }

      function emptyName(product) {
        return lodash.isEmpty(product.service.name);
      }

      function buildOrderList(cartProduct) {
        var orderProduct = {};
        orderProduct.product_id = cartProduct.product.product_type_id;
        orderProduct.answers = cartProduct.product.answers;
        orderProduct.service = cartProduct.service;
        projectOrder.products.push(orderProduct);
      }
    }

    function configure(project, productRow) {
      ProductHelper.showModal(project, productRow).then(handleResult);

      function handleResult(configuration) {
        assembleOrder(configuration, project, productRow);
      }
    }

    function resetDefaultProject() {
      SelectedProjectHelper.reset();
      $modalInstance.close();
      Toasts.toast('Default project for the cart has been reset.');
    }

    function isEmpty() {
      return CartService.isEmpty();
    }

    function tabSelected(project) {
      SelectedProjectHelper.selectProject(project, true);
    }

    // Private
    function assembleOrder(configuration, project, productRow) {
      CartService.projects[project.id].products[productRow.product.cartId].service.name = configuration.name;
    }
  }
})();
