/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { HierarchicalByNameProjection } from 'vs/workbench/contrib/testing/browser/explorerProjections/hierarchalByName';
import { stubTestHierarchyProvider, testStubs } from 'vs/workbench/contrib/testing/common/testStubs';
import { makeTestWorkspaceFolder, TestTreeTestHarness } from 'vs/workbench/contrib/testing/test/browser/testObjectTree';

suite('Workbench - Testing Explorer Hierarchal by Name Projection', () => {
	let harness: TestTreeTestHarness;
	const folder1 = makeTestWorkspaceFolder('f1');
	const folder2 = makeTestWorkspaceFolder('f2');
	setup(() => {
		harness = new TestTreeTestHarness([folder1, folder2], l => new HierarchicalByNameProjection(l, {
			onResultsChanged: () => undefined,
			onTestChanged: () => undefined,
			getStateById: () => ({ state: { state: 0 }, computedState: 0 }),
		} as any));
	});

	teardown(() => {
		harness.dispose();
	});

	test('renders initial tree', async () => {
		harness.c.addRoot(testStubs.nested(), stubTestHierarchyProvider, 'a');
		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' }, { e: 'ab' }, { e: 'b' }
		]);
	});

	test('updates render if a second folder is added', async () => {
		harness.c.addRoot(testStubs.nested('id1-'), stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);
		harness.c.addRoot(testStubs.nested('id2-'), stubTestHierarchyProvider, 'a');
		await harness.flush(folder2);
		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'f1', children: [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }] },
			{ e: 'f2', children: [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }] },
		]);
	});

	test('updates render if second folder is removed', async () => {
		harness.c.addRoot(testStubs.nested('id1-'), stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);
		harness.c.addRoot(testStubs.nested('id2-'), stubTestHierarchyProvider, 'a');
		await harness.flush(folder2);
		harness.onFolderChange.fire({ added: [], changed: [], removed: [folder1] });
		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' }, { e: 'ab' }, { e: 'b' },
		]);
	});

	test('updates render if second test provider appears', async () => {
		harness.c.addRoot(testStubs.nested(), stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);
		harness.c.addRoot(testStubs.test('root2', undefined, [testStubs.test('c')]), stubTestHierarchyProvider, 'b');
		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'root', children: [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }] },
			{ e: 'root2', children: [{ e: 'c' }] },
		]);
	});

	test('updates nodes if they add children', async () => {
		const tests = testStubs.nested();
		harness.c.addRoot(tests, stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);

		tests.children[0].children?.push(testStubs.test('ac'));
		harness.c.onItemChange(tests.children[0], stubTestHierarchyProvider, 'a');

		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' },
			{ e: 'ab' },
			{ e: 'ac' },
			{ e: 'b' }
		]);
	});

	test('updates nodes if they remove children', async () => {
		const tests = testStubs.nested();
		harness.c.addRoot(tests, stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);

		tests.children[0].children?.pop();
		harness.c.onItemChange(tests.children[0], stubTestHierarchyProvider, 'a');

		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' },
			{ e: 'b' }
		]);
	});

	test('swaps when node is no longer leaf', async () => {
		const tests = testStubs.nested();
		harness.c.addRoot(tests, stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);

		tests.children[1].children = [testStubs.test('ba')];
		harness.c.onItemChange(tests.children[1], stubTestHierarchyProvider, 'a');

		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' },
			{ e: 'ab' },
			{ e: 'ba' },
		]);
	});

	test('swaps when node is no longer runnable', async () => {
		const tests = testStubs.nested();
		harness.c.addRoot(tests, stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);

		tests.children[1].children = [testStubs.test('ba')];
		harness.c.onItemChange(tests.children[0], stubTestHierarchyProvider, 'a');
		await harness.flush(folder1);

		tests.children[1].children[0].runnable = false;
		harness.c.onItemChange(tests.children[1].children[0], stubTestHierarchyProvider, 'a');

		assert.deepStrictEqual(await harness.flush(folder1), [
			{ e: 'aa' },
			{ e: 'ab' },
			{ e: 'b' },
		]);
	});
});

