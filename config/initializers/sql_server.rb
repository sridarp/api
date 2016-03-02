db_conf = YAML::load(File.open(File.join(Rails.root,'config','database.yml')))

SQL_SERVER = db_conf["#{Rails.env}_sql_server"]