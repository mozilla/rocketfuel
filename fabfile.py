import os

from fabric.api import env, execute, lcd, local, parallel, roles, task
from fabdeploytools.rpm import RPMBuild
import fabdeploytools.envs

import deploysettings as settings

env.key_filename = settings.SSH_KEY
fabdeploytools.envs.loadenv(os.path.join('/etc/deploytools/envs',
                                         settings.CLUSTER))
ROCKETFUEL = os.path.dirname(__file__)
ROOT = os.path.dirname(ROCKETFUEL)


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
        local('npm install -g commonplace')
        local('commonplace includes')


@task
@roles('web')
@parallel
def _install_package(rpmbuild):
    rpmbuild.install_package()


@task
def deploy():
    with lcd(ROCKETFUEL):
        ref = local('git rev-parse HEAD', capture=True)

    rpmbuild = RPMBuild(name='rocketfuel',
                        env=settings.ENV,
                        ref=ref,
                        cluster=settings.CLUSTER,
                        domain=settings.DOMAIN)
    rpmbuild.build_rpm(ROOT, ['rocketfuel'])

    execute(_install_package, rpmbuild)

    rpmbuild.clean()
