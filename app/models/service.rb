# == Schema Information
#
# Table name: services
#
#  id              :integer          not null, primary key
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  type            :string           not null
#  uuid            :string           not null
#  name            :string           not null
#  health          :integer          default(0), not null
#  status          :integer
#  status_msg      :string
#  vro_workflow_id :string
#
# Indexes
#
#  index_services_on_type  (type)
#  index_services_on_uuid  (uuid)
#

class Service < ActiveRecord::Base
  include Answers

  has_many :alerts, as: :alertable
  has_many :latest_alerts, -> { latest }, class_name: 'Alert', as: :alertable
  has_many :service_outputs
  has_many :logs, as: :loggable, dependent: :destroy

  has_one :order
  has_one :project, through: :order
  has_one :product, through: :order
  has_one :product_type, through: :product
  has_one :provider, through: :product

  enum health: { ok: 0, warning: 1, critical: 2 }
  enum status: {
    unknown: 0,
    pending: 1,
    provisioning: 2,
    starting: 3,
    running: 4,
    available: 5,
    stopping: 6,
    stopped: 7,
    unavailable: 8,
    retired: 9,
    terminated: 10
  }

  accepts_nested_attributes_for :answers

  before_create :ensure_uuid

  def self.policy_class
    ServicePolicy
  end

  def operations
    []
  end

  def start_operation(operation)
    message = operation.to_sym
    send(message) if respond_to? message
  end

  def actions
    ActiveSupport::Deprecation.warn 'Service.actions will be removed in a future update, use Service.operations instead', caller
    operations
  end

  def provision
  end

  def workflow_status
    # service = self
    product = self.product
    product_ans = product.answers
    service_ans = self.answers

    provider_ans = self.provider.answers

    provider_config_hash = {}
    provider_ans.each do |ans|
      provider_config_hash["id"] = ans.value if ans.name == "access_id"
      provider_config_hash["url"] = ans.value if ans.name == "vrealize_host"
      provider_config_hash["username"] = ans.value if ans.name == "username"
      provider_config_hash["password"] = ans.value if ans.name == "secret_key"
    end

    workflow = VcoWorkflows::Workflow.new('Request Component', id: provider_config_hash["id"], 
                                            url: provider_config_hash["url"],
                                            username: provider_config_hash["username"],
                                            password: provider_config_hash["password"],
                                            verify_ssl: false)

    product_ans.each do |ans|
      if ans.name == "data_center"
        dc_obj = SqlServer::DataCenter.find(ans.value)
        workflow.parameter('dataCenter', dc_obj.Datacenter_Name)
      end
      if ans.name == "os"
        os_obj = SqlServer::Os.find(ans.value)
        workflow.parameter('operatingSystem', os_obj.OS_Name)
      end
      if ans.name == "template"
        template_obj = SqlServer::Template.find(ans.value)
        workflow.parameter('templateName', template_obj.Template_Name)
      end      
    end

    req_service_arr = ["environment_type","buid", "cost_center_id", "domain", "backup_nic_required", "primary_role", "vcpus", "char3_server_name", "ram_in_gb", "email_id", "description", "disk_1_size", "disk_2_size", "disk_3_size", "storage_performace_tier"]
    service_ans.each do |answer|
      if answer.name == "environment_type"
        environment_obj = SqlServer::ProdStatus.find(answer.value)
        workflow.parameter('lifeCycleStatus', environment_obj.Prod_Status_Name)
      elsif answer.name == "buid"
        buid_obj = SqlServer::BusinessUnit.find_by_BUID(answer.value)
        workflow.parameter('serverDB_BUID', buid_obj.BUDesc)
      elsif answer.name == "cost_center_id"
        ccid_obj = SqlServer::CostCenter.find_by_CCID(answer.value)
        workflow.parameter('serverDB_CCID', ccid_obj.CCDesc)
      elsif answer.name == "domain"
        domain_obj = SqlServer::Domain.find(answer.value)
        workflow.parameter('domainString', domain_obj.Domain_Name)
      elsif answer.name == "backup_nic_required"
        backup_nic = answer.value == "yes" ? true : false
        workflow.parameter('backupRequired', backup_nic)
      elsif answer.name == "primary_role"
        workflow.parameter('serverRole', answer.value)
      elsif answer.name == "char3_server_name"
        workflow.parameter('projectIdentifier', answer.value)
      elsif answer.name == "vcpus"
        workflow.parameter('vCPUS', answer.value)
      elsif answer.name == "ram_in_gb"
        workflow.parameter('vRAM', answer.value)
      elsif answer.name == "email_id"
        workflow.parameter('notificationEmail', answer.value)
      elsif answer.name == "description"
        workflow.parameter('serverDescription', answer.value)
      elsif answer.name == "disk_1_size"
        workflow.parameter('secondDiskSize', answer.value)
      elsif answer.name == "disk_2_size"
        workflow.parameter('thirdDiskSize', answer.value)
      elsif answer.name == "disk_3_size"
        workflow.parameter('fourthDiskSize', answer.value)
      elsif answer.name == "storage_performace_tier"
        workflow.parameter('storageTier', "Tier#{answer.value}")
      end
    end
    workflow.parameter('needXtraDisks', true)
    workflow.parameter('secondDiskSize', 0) unless workflow.parameter('secondDiskSize').value
    workflow.parameter('thirdDiskSize', 0) unless workflow.parameter('thirdDiskSize').value
    workflow.parameter('fourthDiskSize', 0) unless workflow.parameter('fourthDiskSize').value
    workflow.parameter('serverDBCostCenterString', '')

    wf_token = workflow.token(workflow.execute)
    self.status = wf_token.state
    self.vro_workflow_id = wf_token.id
    self.save
  end

  private

  def ensure_uuid
    self[:uuid] = SecureRandom.uuid if self[:uuid].nil?
  end
end
