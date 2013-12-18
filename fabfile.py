import os

from fabric.api import env, execute, lcd, local, parallel, roles, task
from fabdeploytools import helpers
import fabdeploytools.envs

import deploysettings as settings

env.key_filename = settings.SSH_KEY
fabdeploytools.envs.loadenv(os.path.join('/etc/deploytools/envs',
                                         settings.CLUSTER))
ROCKETFUEL = os.path.dirname(__file__)
ROOT = os.path.dirname(ROCKETFUEL)
COMMONPLACE = '%s/node_modules/commonplace/bin/commonplace' % ROCKETFUEL


@task
def pre_update(ref):
    with lcd(ROCKETFUEL):
        local('git fetch')
        local('git fetch -t')
        local('git reset --hard %s' % ref)


@task
def update():
    with lcd(ROCKETFUEL):
        local('npm install')
        local('npm install --force commonplace@0.2.4')
        local('%s includes' % COMMONPLACE)
        local('%s langpacks' % COMMONPLACE)


@task
@roles('web')
@parallel
def _install_package(rpmbuild):
    rpmbuild.install_package()


@task
def deploy():
    with lcd(ROCKETFUEL):
        ref = local('git rev-parse HEAD', capture=True)

    rpmbuild = helpers.deploy(name='rocketfuel',
                              env=settings.ENV,
                              cluster=settings.CLUSTER,
                              domain=settings.DOMAIN,
                              root=ROOT,
                              deploy_roles=['web'],
                              package_dirs=['rocketfuel'])
