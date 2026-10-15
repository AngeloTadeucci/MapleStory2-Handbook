import { describe, expect, test } from 'vitest';
import { isMissingQuestIndexTableError } from '$lib/server/questLinks';

// Shaped like the error Prisma 7.2.0 with @prisma/adapter-mariadb throws from $queryRaw.
function prismaMissingTable(table: string, schema = 'maple2_codex') {
  const originalMessage = `Table '${schema}.${table}' doesn't exist`;
  return Object.assign(
    new Error(
      `\nInvalid \`prisma.$queryRaw()\` invocation:\n\n\nRaw query failed. Code: \`1146\`. Message: \`${originalMessage}\``
    ),
    {
      name: 'PrismaClientKnownRequestError',
      code: 'P2010',
      clientVersion: '7.2.0',
      meta: {
        driverAdapterError: {
          name: 'DriverAdapterError',
          message: 'TableDoesNotExist',
          cause: { originalCode: '1146', originalMessage, kind: 'TableDoesNotExist', table }
        }
      }
    }
  );
}

describe('isMissingQuestIndexTableError', () => {
  test('matches a Prisma missing table error for quest_objectives', () => {
    expect(isMissingQuestIndexTableError(prismaMissingTable('quest_objectives'))).toBe(true);
  });

  test('matches a Prisma missing table error for quest_rewards', () => {
    expect(isMissingQuestIndexTableError(prismaMissingTable('quest_rewards'))).toBe(true);
  });

  test('does not swallow a missing table that is not a quest index table', () => {
    expect(isMissingQuestIndexTableError(prismaMissingTable('items'))).toBe(false);
    expect(isMissingQuestIndexTableError(prismaMissingTable('quest_objectives_backup'))).toBe(
      false
    );
  });

  test('does not swallow a structured error that is not a missing table', () => {
    const error = prismaMissingTable('quest_objectives');
    error.meta.driverAdapterError.cause = {
      originalCode: '1064',
      originalMessage: "You have an error in your SQL syntax near 'quest_objectives'",
      kind: 'SyntaxError',
      table: 'quest_objectives'
    } as never;
    expect(isMissingQuestIndexTableError(error)).toBe(false);
  });

  test('does not match an unrelated error that only mentions the table', () => {
    expect(isMissingQuestIndexTableError(new Error('Unknown column in quest_objectives'))).toBe(
      false
    );
    expect(isMissingQuestIndexTableError(new Error('connect ECONNREFUSED 127.0.0.1:3306'))).toBe(
      false
    );
    expect(isMissingQuestIndexTableError('quest_rewards')).toBe(false);
    expect(isMissingQuestIndexTableError(undefined)).toBe(false);
  });

  test('falls back to the message when Prisma gives no structured detail', () => {
    expect(
      isMissingQuestIndexTableError(
        new Error(
          "Raw query failed. Code: `1146`. Message: `Table 'db.quest_rewards' doesn't exist`"
        )
      )
    ).toBe(true);
    expect(
      isMissingQuestIndexTableError(
        new Error("Raw query failed. Code: `1146`. Message: `Table 'db.items' doesn't exist`")
      )
    ).toBe(false);
  });

  test('matches a raw driver error by errno and code', () => {
    const error = Object.assign(new Error("Table 'db.quest_objectives' doesn't exist"), {
      errno: 1146,
      code: 'ER_NO_SUCH_TABLE'
    });
    expect(isMissingQuestIndexTableError(error)).toBe(true);
  });
});
