(function() {
  'use strict';

  angular.module('app.components')
    .factory('CartProjectHelper', CartProjectHelperFactory);

  /** @ngInject */
  function CartProjectHelperFactory($modal, Project) {
    var service = {
      showModal: showModal
    };

    return service;

    function showModal(projectId, product) {
      var modalOptions = {
        templateUrl: 'app/components/cart-project-helper/cart-project-helper.html',
        controller: CartProjectHelperController,
        controllerAs: 'vm',
        resolve: {
          projects: resolveProjects,
          projectId: resolveProjectId,
          product: resolveProduct
        },
        windowTemplateUrl: 'app/components/common/modal-window.html'
      };
      var modal = $modal.open(modalOptions);

      return modal.result;

      function resolveProjects(Project) {
        return Project.query({approved: true, archived: false}).$promise;
      }

      function resolveProjectId() {
        return projectId;
      }

      function resolveProduct() {
        return product;
      }
    }
  }

  /** @ngInject */
  function CartProjectHelperController(projects, projectId, product, $modalInstance, CartService, lodash) {
    var vm = this;

    vm.projectId = projectId;
    vm.selections = {
      projectId: null,
      projectDefault: null
    };
    vm.addToCart = addToCart;

    activate();

    function activate() {
      initFields();
    }

    // Private

    function initFields() {
      vm.fields = [
        {
          key: 'projectId',
          type: 'select',
          templateOptions: {
            label: 'Projects',
            options: projects,
            valueProp: 'id',
            labelProp: 'name'
          }
        },
        {
          key: 'projectDefault',
          type: 'checkbox',
          templateOptions: {
            label: 'Default Project',
            checkboxLabel: '  '
          }
        }
      ];
    }

    function addToCart() {
      $modalInstance.close();
      if (vm.selections.projectDefault) {
        CartService.defaultProject(vm.selections.projectId);
      }
      CartService.add(vm.selections.projectId, product);
    }
  }
})();
