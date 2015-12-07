class RemoveProductFromOrders < ActiveRecord::Migration
  def change
    remove_column :orders, :product_id
    remove_column :orders, :service_id
    add_column :services, :product_id, :integer
    add_column :services, :order_id, :integer
  end
end
