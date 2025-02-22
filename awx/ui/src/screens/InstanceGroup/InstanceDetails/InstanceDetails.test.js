import React from 'react';
import { act } from 'react-dom/test-utils';
import * as ConfigContext from 'contexts/Config';
import useDebounce from 'hooks/useDebounce';
import { InstancesAPI, InstanceGroupsAPI } from 'api';
import {
  mountWithContexts,
  waitForElement,
} from '../../../../testUtils/enzymeHelpers';
import InstanceDetails from './InstanceDetails';

jest.mock('../../../api');
jest.mock('../../../hooks/useDebounce');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    id: 2,
    instanceId: 1,
  }),
}));

const instanceGroup = {
  id: 2,
  type: 'instance_group',
  url: '/api/v2/instance_groups/2/',
  related: {
    named_url: '/api/v2/instance_groups/default/',
    jobs: '/api/v2/instance_groups/2/jobs/',
    instances: '/api/v2/instance_groups/2/instances/',
  },
  name: 'default',
  created: '2021-09-08T17:10:39.947029Z',
  modified: '2021-09-08T17:10:39.959187Z',
  capacity: 38,
  committed_capacity: 0,
  consumed_capacity: 0,
  percent_capacity_remaining: 100.0,
  jobs_running: 0,
  jobs_total: 0,
  instances: 3,
  is_container_group: false,
  credential: null,
  policy_instance_percentage: 100,
  policy_instance_minimum: 0,
  policy_instance_list: ['receptor-1', 'receptor-2'],
  pod_spec_override: '',
  summary_fields: {
    user_capabilities: {
      edit: true,
      delete: true,
    },
  },
};
describe('<InstanceDetails/>', () => {
  let wrapper;
  beforeEach(() => {
    useDebounce.mockImplementation((fn) => fn);

    InstancesAPI.readDetail.mockResolvedValue({
      data: {
        id: 1,
        type: 'instance',
        url: '/api/v2/instances/1/',
        related: {
          named_url: '/api/v2/instances/awx_1/',
          jobs: '/api/v2/instances/1/jobs/',
          instance_groups: '/api/v2/instances/1/instance_groups/',
          health_check: '/api/v2/instances/1/health_check/',
        },
        uuid: '00000000-0000-0000-0000-000000000000',
        hostname: 'awx_1',
        created: '2021-09-08T17:10:34.484569Z',
        modified: '2021-09-09T13:55:44.219900Z',
        last_seen: '2021-09-09T20:20:31.623148Z',
        last_health_check: '2021-09-09T20:20:31.623148Z',
        errors: '',
        capacity_adjustment: '1.00',
        version: '19.1.0',
        capacity: 38,
        consumed_capacity: 0,
        percent_capacity_remaining: 100.0,
        jobs_running: 0,
        jobs_total: 0,
        cpu: 8,
        memory: 6232231936,
        cpu_capacity: 32,
        mem_capacity: 38,
        enabled: true,
        managed_by_policy: true,
        node_type: 'hybrid',
      },
    });
    InstancesAPI.readHealthCheckDetail.mockResolvedValue({
      data: {
        uuid: '00000000-0000-0000-0000-000000000000',
        hostname: 'awx_1',
        version: '19.1.0',
        last_health_check: '2021-09-10T16:16:19.729676Z',
        errors: '',
        cpu: 8,
        memory: 6232231936,
        cpu_capacity: 32,
        mem_capacity: 38,
        capacity: 38,
      },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });
  test('Should render proper data', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_superuser: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(wrapper.find('InstanceDetails')).toHaveLength(1);

    expect(InstanceGroupsAPI.readInstances).toBeCalledWith(2);
    expect(InstancesAPI.readHealthCheckDetail).toBeCalledWith(1);
    expect(InstancesAPI.readDetail).toBeCalledWith(1);
    expect(
      wrapper.find("Button[ouiaId='disassociate-button']").prop('isDisabled')
    ).toBe(false);
    expect(
      wrapper.find("Button[ouiaId='health-check-button']").prop('isDisabled')
    ).toBe(false);
  });

  test('should calculate number of forks when slide changes', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_superuser: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);

    expect(wrapper.find('InstanceDetails').length).toBe(1);
    expect(wrapper.find('div[data-cy="number-forks"]').text()).toContain(
      '38 forks'
    );

    await act(async () => {
      wrapper.find('Slider').prop('onChange')(4);
    });

    wrapper.update();

    expect(wrapper.find('div[data-cy="number-forks"]').text()).toContain(
      '56 forks'
    );

    await act(async () => {
      wrapper.find('Slider').prop('onChange')(0);
    });
    wrapper.update();
    expect(wrapper.find('div[data-cy="number-forks"]').text()).toContain(
      '32 forks'
    );

    await act(async () => {
      wrapper.find('Slider').prop('onChange')(0.5);
    });
    wrapper.update();
    expect(wrapper.find('div[data-cy="number-forks"]').text()).toContain(
      '35 forks'
    );
  });

  test('buttons should be disabled', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_system_auditor: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(
      wrapper.find("Button[ouiaId='disassociate-button']").prop('isDisabled')
    ).toBe(true);
    expect(
      wrapper.find("Button[ouiaId='health-check-button']").prop('isDisabled')
    ).toBe(true);
  });

  test('should display instance toggle', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_system_auditor: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(wrapper.find('InstanceToggle').length).toBe(1);
  });

  test('should throw error because intance is not associated with instance group', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 3,
          },
          {
            id: 3,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_superuser: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(wrapper.find('ContentError')).toHaveLength(1);
    expect(InstanceGroupsAPI.readInstances).toBeCalledWith(2);
    expect(InstancesAPI.readHealthCheckDetail).not.toBeCalled();
    expect(InstancesAPI.readDetail).not.toBeCalled();
  });

  test('Should make request for Health Check', async () => {
    InstancesAPI.createHealthCheck.mockResolvedValue({
      data: {
        uuid: '00000000-0000-0000-0000-000000000000',
        hostname: 'awx_1',
        version: '19.1.0',
        last_health_check: '2021-09-15T18:02:07.270664Z',
        errors: '',
        cpu: 8,
        memory: 6232231936,
        cpu_capacity: 32,
        mem_capacity: 38,
        capacity: 38,
      },
    });
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_superuser: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(
      wrapper.find("Button[ouiaId='health-check-button']").prop('isDisabled')
    ).toBe(false);
    await act(async () => {
      wrapper.find("Button[ouiaId='health-check-button']").prop('onClick')();
    });
    expect(InstancesAPI.createHealthCheck).toBeCalledWith(1);
    wrapper.update();
    expect(
      wrapper.find("Detail[label='Last Health Check']").prop('value')
    ).toBe('9/15/2021, 6:02:07 PM');
  });

  test('Should handle api error for health check', async () => {
    InstancesAPI.createHealthCheck.mockRejectedValue(
      new Error({
        response: {
          config: {
            method: 'post',
            url: '/api/v2/instances/1/health_check',
          },
          data: 'An error occurred',
          status: 403,
        },
      })
    );
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_superuser: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    expect(
      wrapper.find("Button[ouiaId='health-check-button']").prop('isDisabled')
    ).toBe(false);
    await act(async () => {
      wrapper.find("Button[ouiaId='health-check-button']").prop('onClick')();
    });
    expect(InstancesAPI.createHealthCheck).toBeCalledWith(1);
    wrapper.update();
    expect(wrapper.find('AlertModal')).toHaveLength(1);
    expect(wrapper.find('ErrorDetail')).toHaveLength(1);
  });

  test('Should call disassociate', async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_system_auditor: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    await act(async () =>
      wrapper.find('Button[ouiaId="disassociate-button"]').prop('onClick')()
    );
    wrapper.update();
    await act(async () =>
      wrapper
        .find('Button[ouiaId="disassociate-modal-confirm"]')
        .prop('onClick')()
    );
    wrapper.update();

    expect(InstanceGroupsAPI.disassociateInstance).toHaveBeenCalledWith(2, 1);
  });

  test('Should throw disassociate error', async () => {
    InstanceGroupsAPI.disassociateInstance.mockRejectedValue(
      new Error({
        response: {
          config: {
            method: 'post',
            url: '/api/v2/instance_groups',
          },
          data: 'An error occurred',
          status: 403,
        },
      })
    );
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
    });
    jest.spyOn(ConfigContext, 'useConfig').mockImplementation(() => ({
      me: { is_system_auditor: true },
    }));
    await act(async () => {
      wrapper = mountWithContexts(
        <InstanceDetails
          instanceGroup={instanceGroup}
          setBreadcrumb={() => {}}
        />
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
    await act(async () =>
      wrapper.find('Button[ouiaId="disassociate-button"]').prop('onClick')()
    );
    wrapper.update();
    await act(async () =>
      wrapper
        .find('Button[ouiaId="disassociate-modal-confirm"]')
        .prop('onClick')()
    );
    wrapper.update();
    expect(wrapper.find('AlertModal')).toHaveLength(1);
    expect(wrapper.find('ErrorDetail')).toHaveLength(1);
  });
});
