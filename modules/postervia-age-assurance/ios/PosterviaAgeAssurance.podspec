Pod::Spec.new do |s|
  s.name           = 'PosterviaAgeAssurance'
  s.version        = '0.1.0'
  s.summary        = 'Postervia platform age-assurance bridge'
  s.description    = 'Bridges privacy-preserving Android and iOS age-range APIs.'
  s.author         = 'Postervia'
  s.homepage       = 'https://postervia.app'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'DeclaredAgeRange'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
