gcloud services disable  appengine.googleapis.com disable_dependent_services=true
gcloud services disable  bigquery.googleapis.com disable_dependent_services=true
gcloud services disable  bigquerystorage.googleapis.com disable_dependent_services=true
gcloud services disable  cloudapis.googleapis.com disable_dependent_services=true
gcloud services disable  clouddebugger.googleapis.com disable_dependent_services=true
gcloud services disable  cloudresourcemanager.googleapis.com disable_dependent_services=true
gcloud services disable  cloudtrace.googleapis.com disable_dependent_services=true
gcloud services disable  datastore.googleapis.com disable_dependent_services=true
gcloud services disable  fcm.googleapis.com disable_dependent_services=true
gcloud services disable  fcmregistrations.googleapis.com disable_dependent_services=true
gcloud services disable  firebase.googleapis.com disable_dependent_services=true
gcloud services disable  firebaseappcheck.googleapis.com disable_dependent_services=true
-gcloud services disable  firebaseappdistribution.googleapis.com disable_dependent_services=true
gcloud services disable  firebasedynamiclinks.googleapis.com disable_dependent_services=true
gcloud services disable  firebasehosting.googleapis.com disable_dependent_services=true
gcloud services disable  firebaseinstallations.googleapis.com disable_dependent_services=true
gcloud services disable  firebaseremoteconfig.googleapis.com disable_dependent_services=true
gcloud services disable  firebaserules.googleapis.com disable_dependent_services=true
gcloud services disable  googlecloudmessaging.googleapis.com disable_dependent_services=true
gcloud services disable  identitytoolkit.googleapis.com disable_dependent_services=true
gcloud services disable  logging.googleapis.com disable_dependent_services=true
gcloud services disable  mobilecrashreporting.googleapis.com disable_dependent_services=true
gcloud services disable  monitoring.googleapis.com disable_dependent_services=true
gcloud services disable  pubsub.googleapis.com disable_dependent_services=true
gcloud services disable  runtimeconfig.googleapis.com disable_dependent_services=true
gcloud services disable  securetoken.googleapis.com disable_dependent_services=true
gcloud services disable  servicemanagement.googleapis.com disable_dependent_services=true
gcloud services disable  serviceusage.googleapis.com disable_dependent_services=true
gcloud services disable  sql-component.googleapis.com disable_dependent_services=true
gcloud services disable  storage-api.googleapis.com disable_dependent_services=true
gcloud services disable  storage-component.googleapis.com disable_dependent_services=true
gcloud services disable  storage.googleapis.com disable_dependent_services=true
gcloud services disable  testing.googleapis.com disable_dependent_services=true

gcloud services enable  geocoding-backend.googleapis.com
gcloud services enable  geolocation.googleapis.com
gcloud services enable  maps-backend.googleapis.com
gcloud services enable  regionlookup.googleapis.com

gcloud services disable  disable_dependent_services=true check_if_service_has_usage=SKIP firebaseappcheck.googleapis.com
