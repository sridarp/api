class RegisteredProvider < ActiveRecord::Base
  class Demo < RegisteredProvider
    def self.load_registered_providers
      return unless super

      # transaction do
      #   [
      #     set('Demo', '3c997248-e35e-408e-a577-3195dfa7f32e')
      #   ].each { |s| create! s.merge!(type: 'RegisteredProvider::Demo') }
      # end
    end

    def provider_class
      'Provider::Demo'.constantize
    end

    def description
      'Demo registered provider'
    end

    def tags
      ['demo']
    end

    def questions
      []
    end
  end
end
