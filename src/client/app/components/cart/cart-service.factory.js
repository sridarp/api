(function() {
  'use strict';

  angular.module('app.components')
    .factory('CartService', CartServiceFactory);

  /** @ngInject */
  function CartServiceFactory(Toasts, $modal, lodash, Project) {
    var service = {
      items: {},
      itemCountTotal: 0,
      add: add,
      remove: remove,
      clear: clear,
      isEmpty: isEmpty,
      showModal: showModal,
      defaultProject: defaultProject,
      isDefaultProject: isDefaultProject,
      resetDefaultProject: resetDefaultProject
    };

    return service;

    function updateProjectDetails(projectId) {
      Project.get({
        id: projectId,
        'includes[]': ['latest_alerts']
      }).$promise.then(handleResults);

      function handleResults(data) {
        service.items[projectId].project = data;
      }
    }

    function add(projectId, product) {
      if (angular.isUndefined(service.items[projectId])) {
        updateProjectDetails(projectId);
        service.items[projectId] = {
          project: {},
          products: {},
          orders: {},
          orderCount: 0,
          itemCount: 0
        };
      }
      service.itemCountTotal += 1;
      service.items[projectId].itemCount += 1;
      var cartId = service.items[projectId].itemCount;

      service.items[projectId].products[cartId] = {
        product: lodash.cloneDeep(product),
        price: 0,
        service: {
          name: '',
          orderId: null
        }
      };

      totalUpProject(service.items[projectId].project);
      service.items[projectId].products[cartId].product.cartId = cartId;
      Toasts.toast(product.name + ' has been add to your cart under ' + service.items[projectId].project.name);
    }

    function remove(project, productObj) {
      if (!productObj) {
        delete service.items[project.id];

        return;
      } else {
        if (!inCart(project, productObj.product)) {
          return;
        }
        service.items[project.id].itemCount -= 1;
        service.itemCountTotal -= 1;
        if (productObj.service.orderId) {
          service.items[project.id].orderCount -= 1;
          delete service.items[project.id].orders[productObj.service.orderId];
        }
        delete service.items[project.id].products[productObj.product.cartId];
        if (0 === Object.keys(service.items[project.id].products).length) {
          delete service.items[project.id];
        }
      }
      totalUpProject(project);
    }

    function clear() {
      service.items = {};
      service.itemCountTotal = 0;
    }

    function isEmpty() {
      return 0 === Object.keys(service.items).length;
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

    function defaultProject(setDefault) {
      if (setDefault) {
        service.defaultProjectNumber = setDefault;
      } else {
        return service.defaultProjectNumber;
      }
    }

    function isDefaultProject(projectId) {
      if (!defaultProject()) {
        return projectId === defaultProject();
      } else {
        return true;
      }
    }

    function resetDefaultProject() {
      service.defaultProjectNumber = null;
    }

    function inCart(project, product) {
      return service.items[project.id] && service.items[project.id].products[product.cartId];
    }

    function totalUpProject(project) {
      if (angular.isUndefined(service.items[project.id])) {
        return;
      }

      service.items[project.id].total = 0;
      angular.forEach(service.items[project.id].products, computeProductTotal);
      function computeProductTotal(line) {
        line.price = (parseFloat(line.product.monthly_price)) + ((parseFloat(line.product.hourly_price)) * 750);
        service.items[project.id].total += line.price;
      }
    }
  }

  /** @ngInject */
  function CartModalController(CartService, CartConfigureHelper, $modalInstance, Toasts, Order, SessionService) {
    var vm = this;

    vm.remove = remove;
    vm.clear = clear;
    vm.checkout = checkout;
    vm.configure = configure;
    vm.isEmpty = isEmpty;
    vm.resetDefaultProject = resetDefaultProject;
    vm.tabSelected = tabSelected;
    vm.items = CartService.items;

    function remove(project, product) {
      CartService.remove(project, product);
    }

    function clear() {
      CartService.clear();
    }

    function checkout() {
      var projectObject = CartService.items[CartService.defaultProject()];
      if (projectObject.orderCount === projectObject.itemCount) {
        if (projectObject.project.budget >= projectObject.total) {
          projectObject.orders.staff_id = SessionService.id;
          Order.save(projectObject.orders, saveSuccess, saveError);
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
    }

    function configure(project, productRow) {
      CartConfigureHelper.showModal(project, productRow).then(handleResult);

      function handleResult(configuration) {
        assembleOrder(configuration, project, productRow);
      }
    }

    function resetDefaultProject() {
      CartService.resetDefaultProject();
      $modalInstance.close();
      Toasts.toast('Default project for the cart has been reset.');
    }

    function isEmpty() {
      return CartService.isEmpty();
    }

    function tabSelected(projectId) {
      CartService.defaultProject(projectId);
    }

    // Private
    function assembleOrder(configuration, project, productRow) {
      var orderId;
      if (!CartService.items[project.id].products[productRow.product.cartId].service.orderId) {
        CartService.items[project.id].orderCount += 1;
        orderId = CartService.items[project.id].orderCount;
        CartService.items[project.id].products[productRow.product.cartId].service.orderId = orderId;
      } else {
        orderId = CartService.items[project.id].products[productRow.product.cartId].service.orderId;
      }

      var order = Order.new({product_id: productRow.product.id});
      order.project_id = project.id;
      order.service.name = configuration.name;
      order.answers = productRow.product.answers;

      CartService.items[project.id].orders[orderId] = order;
      CartService.items[project.id].products[productRow.product.cartId].service.name = configuration.name;
    }
  }
})();
