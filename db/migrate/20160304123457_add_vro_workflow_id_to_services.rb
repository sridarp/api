class AddVroWorkflowIdToServices < ActiveRecord::Migration
  def change
  	add_column :services, :vro_workflow_id, :string
  end
end
