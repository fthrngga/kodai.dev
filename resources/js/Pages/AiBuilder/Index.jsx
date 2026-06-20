import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

export default function Index({ auth, projects }) {
    const { data, setData, post, processing, errors } = useForm({
        prompt: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('ai-builder.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">AI App Builder</h2>}
        >
            <Head title="AI App Builder" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <header>
                            <h2 className="text-lg font-medium text-gray-900">Create a New AI Project</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Describe the application or website you want to build. Our AI engine will generate it for you.
                            </p>
                        </header>

                        <form onSubmit={submit} className="mt-6 space-y-6">
                            <div>
                                <InputLabel htmlFor="prompt" value="What do you want to build?" />

                                <textarea
                                    id="prompt"
                                    className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm mt-1 block w-full h-32 p-3"
                                    value={data.prompt}
                                    onChange={(e) => setData('prompt', e.target.value)}
                                    required
                                    placeholder="e.g. A landing page for a modern coffee shop with dark mode and a booking form."
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <PrimaryButton disabled={processing}>Generate Project</PrimaryButton>
                            </div>
                        </form>
                    </div>

                    {projects && projects.length > 0 && (
                        <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Projects</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projects.map((project) => (
                                    <div key={project.id} className="border p-4 rounded-lg flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">{project.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Status: {project.status}</p>
                                        </div>
                                        <div className="mt-4">
                                            <Link 
                                                href={route('ai-builder.show', project.id)}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                            >
                                                Open Project &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
